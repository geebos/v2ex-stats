import { getPostStatus, updatePostStatus } from "@/service/history/post";
import { getPostInfo } from "@/service/history/collect";
import { xpath } from "@/service/utils";
import { getIsDarkMode } from "@/service/utils";

const newCommentsLabel = new Array<Element>();

// ===== 主要导出函数 =====

// 初始化帖子标签功能，设置页面事件监听
export const tryInitPostsLabel = async (username: string): Promise<void> => {
  // 注入CSS样式
  injectStyle();
  
  // 监听页面显示事件，页面恢复时重新更新标签
  window.addEventListener('pageshow', async () => {
    updatePostsLable(username);
    await updateCommentsLabel(username);
    // 滚动到第一个新评论
    scrollToNewComments(0);
  });
}

// ===== 帖子列表标签更新逻辑 =====

// 更新主页帖子列表中的新回复数标签
const updatePostsLable = (username: string) => {
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
      console.log('有新回复', postId, replyCount, postStatus);
    } else {
      // 没有新回复：清除标签样式
      clearLabel(anchor);
      console.log('没有新回复', postId, replyCount, postStatus);
    }
  });
}

// ===== 评论标签更新逻辑 =====

// 更新帖子页面中的新评论标签
const updateCommentsLabel = async (username: string) => {
  // 获取所有评论编号元素
  const spanList = xpath('//div[@id="Main"]//div[@class="box"][2]//div[starts-with(@id, "r_")]//span[@class="no"]', document) as Node[];
  console.log('帖子评论数标签', spanList);
  
  if (spanList.length === 0) {
    return;
  }

  // 获取当前帖子ID
  const { postId } = getPostInfo(window.location.href, document);
  if (!postId) {
    console.error('没有找到帖子ID', window.location.href);
    return;
  }
  
  // 获取帖子历史浏览记录
  const postStatus = await getPostStatus(username, postId);
  if (!postStatus) {
    console.log('帖子之前没访问过，不高亮', postId);
    return;
  }
  console.log('帖子浏览记录', postStatus)

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
    if (!postStatus.viewedCount) {
      console.log('帖子之前没访问过，不高亮', postId);
      return;
    }
    
    if (currentNo > postStatus.viewedCount) {
      // 新评论：应用高亮标签
      applyLabel(spanElement, 'new');
      newCommentsLabel.push(spanElement);
    } else {
      // 已读评论：清除标签
      clearLabel(spanElement);
    }
  });
  console.log('新评论标签', newCommentsLabel);
  
  // 更新用户已查看的评论数
  await updatePostStatus(username, { postId, viewedCount: maxNo, timestamp: Date.now() });
}

const scrollToNewComments = (index: number) => {
  if (index >= newCommentsLabel.length) {
    console.log('index范围错误，没有新评论');
    return;
  }
  console.log('滚动到新评论', index, newCommentsLabel[index]);
  newCommentsLabel[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== 样式操作辅助函数 =====

// 为链接元素应用新回复标签样式
const applyLabel = (element: HTMLElement, content: string) => {
  element.style.position = 'relative';
  element.classList.add('v-stats-count-label');
  element.setAttribute('data-new', content);
}

// 清除元素的标签样式
const clearLabel = (element: HTMLElement) => {
  element.classList.remove('v-stats-count-label');
  element.removeAttribute('data-new');
}

// ===== CSS样式注入 =====

// 注入新回复数标签的CSS样式
const injectStyle = () => {
  // 根据当前主题模式选择合适的颜色
  const isDarkMode = getIsDarkMode();
  const color = isDarkMode ? '#2E7D32' : '#4CAF50';
  
  // 创建并插入样式元素
  const style = document.createElement('style');
  style.textContent = `
    .v-stats-count-label::after {
      content: attr(data-new); /* 从data-new属性读取显示内容 */
      position: absolute;
      top: -8px;
      right: -15px;
      background-color: ${color}; /* 根据主题设置背景色 */
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 999px;
    }`;
  document.head.appendChild(style);
}