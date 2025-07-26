import { updatePostStatus } from "@/service/history/post";
import { getIsDarkMode } from "@/service/utils";
import { debounce, once } from "lodash";
import { processCommentsUI } from "@/ui/comments.ui";
import { processPostUI } from "@/ui/post.ui";

// ======================== 页面检测相关 ========================

// 检测当前页面类型
export const detectPageInfo = () => {
  const isIndexPage = window.location.pathname === '/';
  const isPostPage = /\/t\/\d+/.test(window.location.pathname);
  return { isIndexPage, isPostPage };
}

// ======================== UI处理相关 ========================

// 根据页面类型处理对应的UI
const processUI = async (username: string) => {
  const { isIndexPage, isPostPage } = detectPageInfo();
  if (isIndexPage) await processPostUI(username);
  if (isPostPage) await processCommentsUI(username);
}

// ======================== 页面监听相关 ========================

// 注册页面变化监听器
const registerMutationObserver = async (username: string) => {
  const container = document.querySelector('#Main');
  if (!container) {
    console.error('没有找到主容器，无法监听页面变化');
    return;
  }

  // 监听页面内容变化，防抖处理UI更新
  const observer = new MutationObserver(debounce(async () => {
    await processUI(username);
  }, 50, { leading: false, trailing: true }));
  observer.observe(container, { childList: true, subtree: true });

  // 监听页面加载完成，执行回调
  const loadedObserver = new MutationObserver(debounce(once(async () => {
    console.log('页面加载完成，停止监听');
    observer.disconnect();
    loadedObserver.disconnect();
  }), 500, { leading: false, trailing: true }));
  loadedObserver.observe(container, { childList: true, subtree: true });

  // 手动触发一次监听器，确保初始化执行
  container.appendChild(document.createTextNode(''));
}

// ======================== 样式和标签操作相关 ========================

// 注入新回复标签的CSS样式
export const injectStyle = () => {
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

// 为链接元素应用新回复标签样式
export const applyLabel = (element: HTMLElement, content: string) => {
  element.style.position = 'relative';
  element.classList.add('v-stats-count-label');
  element.setAttribute('data-new', content);
}

// 清除元素的标签样式
export const clearLabel = (element: HTMLElement) => {
  element.classList.remove('v-stats-count-label');
  element.removeAttribute('data-new');
}

// ======================== 主入口函数 ========================

// 初始化帖子标签功能，设置页面事件监听
export const tryInitUI = async (username: string): Promise<void> => {
  // 注入CSS样式
  injectStyle();

  // 监听页面显示事件
  window.addEventListener('pageshow', async () => {
    await processUI(username);
  });

  // 注册页面变化监听器
  await registerMutationObserver(username);

  // 开发环境下暴露调试函数
  if (import.meta.env.DEV) {
    console.log('开发环境，注入updatePostStatus，用于调试');
    (window as any).updatePostStatus = updatePostStatus;
  }
}