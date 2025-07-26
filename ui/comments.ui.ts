import { getPostInfo } from "@/service/history/collect";
import { getPostStatus, PostStatus, updatePostStatus } from "@/service/history/post";
import { xpath } from "@/service/utils";
import { applyLabel, clearLabel } from "@/ui/index";
import { once } from "lodash";

// ======================== 全局状态管理 ========================

// 帖子页面全局数据
const globalData: {
  // 进入帖子页面时的帖子状态，专用于 updateCommentsLabel 函数  
  currentPostStatus?: PostStatus
} = {};

// 初始化当前帖子状态
const initCurrentPostStatus = async (username: string) => {
  const { postId } = getPostInfo(window.location.href, document);
  globalData.currentPostStatus = await getPostStatus(username, postId);
  console.log('初始化帖子信息', globalData.currentPostStatus);
}

// 防止 mutationObserver 多次触发导致被最新数据覆盖
let initCurrentPostStatusOnce = once(initCurrentPostStatus);

// ======================== DOM元素操作相关 ========================

// 获取所有评论编号元素
const findAllCommentsElement = () => {
  return xpath(`//div[@id="Main"]//div[@class="box"][2]//div[starts-with(@id, "r_")]//span[@class="no" or @class="no v-stats-count-label"]`, document) as Node[];
};

// ======================== 评论标签更新相关 ========================

// 更新帖子页面中的新评论标签
export const updateCommentsLabel = async (username: string) => {
  await initCurrentPostStatusOnce(username);

  if (!globalData.currentPostStatus) {
    console.log('帖子之前没访问过，不高亮');
    return;
  }
  const { postId, viewedCount } = globalData.currentPostStatus;

  // 获取所有评论编号元素
  const spanList = findAllCommentsElement();
  console.log('帖子评论数标签', spanList);

  if (spanList.length === 0) {
    console.log('帖子没有评论，更新帖子状态');
    await updatePostStatus(username, { postId, viewedCount: 0, timestamp: Date.now() });
    return;
  }

  // 处理评论标签并记录最大评论数
  let maxNo = 0;
  spanList.forEach(async (span) => {
    const spanElement = span as HTMLSpanElement;
    const currentNo = parseInt(spanElement.textContent || '0', 10);

    // 更新最大评论编号
    if (currentNo > maxNo) {
      maxNo = currentNo;
    }

    // 检查是否为新评论
    if (!viewedCount) {
      console.log('帖子之前没访问过，不高亮', postId);
      return;
    }

    if (currentNo > viewedCount) {
      // 新评论：应用高亮标签
      applyLabel(spanElement, 'new');
    } else {
      // 已读评论：清除标签
      clearLabel(spanElement);
    }
  });

  // 更新用户已查看的评论数
  if (!viewedCount || maxNo > viewedCount) {
    await updatePostStatus(username, { postId, viewedCount: maxNo, timestamp: Date.now() });
  }
}

// ======================== 滚动功能相关 ========================

// 滚动到指定楼层的评论
const scrollToComments = (floor: number) => {
  // 查找所有评论编号元素
  const commentElements = findAllCommentsElement();

  if (commentElements.length === 0) {
    console.log('没有找到评论', floor);
    return;
  }

  // 查找匹配楼层号的评论元素
  const targetElement = commentElements.find(element => {
    const span = element as HTMLSpanElement;
    const commentNo = parseInt(span.textContent || '0', 10);
    return commentNo === floor;
  }) as HTMLElement;

  if (!targetElement) {
    console.log('没有找到指定楼层的评论', floor);
    return;
  }

  console.log('滚动到评论', floor, targetElement);
  // 滚动到目标评论，居中显示
  targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
}

// 滚动到第一条新评论
const scrollToFirstNewComment = () => {
  if (!globalData.currentPostStatus) {
    console.log('帖子之前没访问过，不滚动');
    return;
  }

  const { viewedCount, replyCount } = globalData.currentPostStatus;
  if (viewedCount && viewedCount !== replyCount) {
    // 滚动到用户上次查看位置之后的第一条新评论
    scrollToComments(viewedCount + 1);
  }
}

// ======================== 主处理函数 ========================

// 处理帖子评论页面UI
export const processCommentsUI = async (username: string) => {
  console.log('处理帖子评论UI');
  await updateCommentsLabel(username);
  await scrollToFirstNewComment();
}