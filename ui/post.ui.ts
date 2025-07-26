import { getPostInfo } from "@/service/history/collect";
import { getPostStatus } from "@/service/history/post";
import { xpath } from "@/service/utils";
import { applyLabel, clearLabel } from "@/ui/index";

// ======================== 帖子列表页面处理 ========================

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

    // 从链接URL中解析帖子ID和当前回复数
    const { postId, replyCount } = getPostInfo(anchor.href, document);
    if (!postId) {
      return;
    }

    // 获取用户历史访问时的帖子状态
    const postStatus = await getPostStatus(username, postId);

    if (postStatus && replyCount > postStatus.replyCount) {
      // 有新回复：显示增量标签
      const newCount = replyCount - postStatus.replyCount;
      applyLabel(anchor, `+${newCount}`);
    } else {
      // 没有新回复：清除标签样式
      clearLabel(anchor);
    }
  });
}

// 处理帖子列表页面UI
export const processPostUI = async (username: string) => {
  console.log('处理帖子UI');
  await updatePostsLable(username);
}
