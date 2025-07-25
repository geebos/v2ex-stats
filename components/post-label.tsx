import { getPostStatus, updatePostStatus } from "@/service/history/post";
import { getPostInfo } from "@/service/history/collect";
import { xpath } from "@/service/utils";
import { getIsDarkMode } from "@/service/utils";
import { debounce, once } from "lodash";
import type { PostStatus } from "@/service/history/post";

const globalData: {
  // 进入帖子页面时的帖子状态，专用于 updateCommentsLabel 函数  
  currentPostStatus?: PostStatus
} = {};

const initCurrentPostStatus = once(async (username: string) => {
  // 初始化帖子信息，防止 mutationObserver 多次触发导致被最新数据覆盖
  const { postId } = getPostInfo(window.location.href, document);
  globalData.currentPostStatus = await getPostStatus(username, postId);
  console.log('初始化帖子信息', globalData.currentPostStatus); 
});

// ===== 主要导出函数 =====

// 初始化帖子标签功能，设置页面事件监听
export const tryInitPostsLabel = async (username: string): Promise<void> => {
  const { isIndexPage, isPostPage } = detectPageInfo();

  // 注入CSS样式
  injectStyle();

  // 监听页面变化，更新帖子标签
  const observer = new MutationObserver(debounce(async () => {
    if (isIndexPage) {
      console.log('检测到主页，更新帖子列表标签');
      await updatePostsLable(username);
    }
    if (isPostPage) {
      console.log('检测到帖子页，更新帖子评论标签');
      await updateCommentsLabel(username);
      // 自动滚动到第一个新评论
      if (globalData.currentPostStatus) {
        const { viewedCount, replyCount } = globalData.currentPostStatus;
        if (viewedCount && viewedCount !== replyCount) {
          // 滚动到用户上次查看位置之后的第一条新评论
          scrollToComments(viewedCount + 1);
        }
      }
    }
  }, 50, { leading: false, trailing: true }));

  const mainContainer = document.querySelector('#Main');
  if (mainContainer) {
    observer.observe(mainContainer, { childList: true, subtree: true });
    // 至少触发一次 MutationObserver
    mainContainer.appendChild(document.createTextNode(''));
  } else {
    console.error('没有找到主容器，无法监听页面变化');
  }

  if (import.meta.env.DEV) {
    console.log('开发环境，注入updatePostStatus');
    (window as any).updatePostStatus = updatePostStatus;
  }
}

const detectPageInfo = () => {
  const isIndexPage = window.location.pathname === '/';
  const isPostPage = /\/t\/\d+/.test(window.location.pathname);
  return { isIndexPage, isPostPage };
}

// ===== 帖子列表标签更新逻辑 =====

// 更新主页帖子列表中的新回复数标签
const updatePostsLable = async (username: string) => {
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

// ===== 评论标签更新逻辑 =====

// 更新帖子页面中的新评论标签
const updateCommentsLabel = async (username: string) => {
  await initCurrentPostStatus(username);

  if (!globalData.currentPostStatus) {
    console.log('帖子之前没访问过，不高亮');
    return;
  }
  const { postId, viewedCount } = globalData.currentPostStatus;

  // 获取所有评论编号元素
  const spanList = xpath('//div[@id="Main"]//div[@class="box"][2]//div[starts-with(@id, "r_")]//span[@class="no"]', document) as Node[];
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

// 滚动到指定楼层的评论
const scrollToComments = (floor: number) => {
  // 查找所有评论编号元素
  const commentElements = xpath(`//div[@id="Main"]//div[@class="box"][2]//div[starts-with(@id, "r_")]//span[@class="no" or @class="no v-stats-count-label"]`, document) as Node[];
  
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