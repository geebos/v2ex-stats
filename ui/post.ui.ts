import { getPostInfo } from "@/service/history/collect";
import { getPostStatus, PostStatus } from "@/service/history/post";
import { xpath } from "@/service/utils";
import { applyLabel, clearLabel } from "@/ui/index";

// V2EX 每页评论数量
const V2EX_COMMENT_PAGE_SIZE = 100;

// ======================== 帖子列表页面处理 ========================

// 检测页面插件环境
const detectPlugins = () => {
  // 检测是否是 V2EX Polish
  const isVP = Array.from(document.body.classList).some(className => className.includes('v2p'))
  return { isVP }
}

// 根据帖子状态修改跳转链接，直接跳到最新评论页
const tryModifyHrefPage = (anchor: HTMLAnchorElement, postStatus: PostStatus) => {
  const { viewedCount } = postStatus;
  const { isVP } = detectPlugins();
  // 如果没有查看记录或使用 V2EX Polish 插件则跳过
  if (!viewedCount || isVP) return;

  // 如果评论数不超过一页则无需修改
  if (viewedCount <= V2EX_COMMENT_PAGE_SIZE) return;

  // 最新评论需要翻页，修改跳转链接直接跳到最新评论所在页
  const page = Math.ceil(viewedCount / V2EX_COMMENT_PAGE_SIZE);

  // 构建带页码的 URL
  const url = new URL(anchor.href);
  url.searchParams.set('p', page.toString());
  console.log('修改跳转链接', anchor.href, '到', url.toString());

  // 更新回复数链接
  anchor.href = url.toString();
  // 同时更新标题链接
  const titleAnchor = xpath('../../td[3]//a', anchor) as HTMLAnchorElement[];
  if (titleAnchor && titleAnchor.length > 0) {
    titleAnchor[0].href = url.toString();
  }
}

// 处理单个帖子的回复数标签和跳转链接
const processPostAnchor = async (username: string, anchor: HTMLAnchorElement) => {
  // 从链接URL中解析帖子ID和当前回复数
  const { postId, replyCount } = getPostInfo(anchor.href, document);
  // 获取用户历史访问时的帖子状态
  const postStatus = await getPostStatus(username, postId);
  if (!postStatus) {
    console.log('帖子状态不存在', anchor.href);
    return;
  }

  // 比较当前回复数与历史回复数
  if (replyCount > postStatus.replyCount) {
    // 有新回复：显示增量标签
    const newCount = replyCount - postStatus.replyCount;
    applyLabel(anchor, `+${newCount}`);
  } else {
    // 没有新回复：清除标签样式
    clearLabel(anchor);
  }

  // 尝试修改跳转链接到最新评论页
  tryModifyHrefPage(anchor, postStatus);
}

// 更新主页帖子列表中的新回复数标签
export const updatePostsLable = async (username: string) => {
  // 获取主页帖子列表中的回复数链接元素
  const aList = xpath('(//div[@id="Main"]//div[@class="box"])[1]//div[@class="cell item"]//td[4]/a', document.body) as Node[];
  console.log('帖子标签', aList);
  if (aList.length === 0) {
    return;
  }

  // 遍历每个帖子链接，检查是否有新回复
  aList.forEach(async (a) => {
    const anchor = a as HTMLAnchorElement;
    await processPostAnchor(username, anchor);
  });
}

export const initPostIngoreButtons = async (username: string) => {
  // 获取主页帖子列表中的回复数链接元素
  const tdList = xpath('(//div[@id="Main"]//div[@class="box"])[1]//div[@class="cell item"]//td[4]', document.body) as HTMLTableDataCellElement[];
  console.log('帖子标签', tdList);
  if (tdList.length === 0) {
    return;
  }

  // 遍历每个帖子链接，检查是否有新回复
  tdList.forEach(async (td) => {
    const div = document.createElement('div');
    div.innerText = '忽略更新';
    div.classList.add('v-stats-ignore-button');
    div.onclick = async () => {
      console.log('忽略更新', username, td);
    }
    td.classList.add('v-stats-ignore-button-container');
    td.appendChild(div);
  });
}

// 处理帖子列表页面UI
export const processPostUI = async (username: string) => {
  console.log('处理帖子UI');
  await updatePostsLable(username);
}
