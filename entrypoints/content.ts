import type { PageInfo } from '@/types/types';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import App from '@/components/app';
import { initCollect } from '@/service/time/collect';

// ==================== 页面检测和信息获取 ====================
const detectAndGetInfo = (): PageInfo => {
  const isV2ex = window.location.hostname.endsWith('.v2ex.com');
  const isBalancePage = window.location.pathname === '/balance';

  const memberLink = Array.from(document.querySelectorAll('a'))
    .find(a => /^\/member\/[\w-]+$/.test(a.getAttribute('href') || ''));

  const isLoggedIn = !!memberLink;
  const username = isLoggedIn && memberLink
    ? memberLink.href.split('/').pop()?.trim() ?? ''
    : '';

  const info: PageInfo = { isV2ex, isBalancePage, isLoggedIn, username };
  console.log('页面信息:', info);
  return info;
};

// ==================== 图表初始化 ====================
const initApp = async (username: string) => {
  const anchor = document.querySelector('div.balance_area');
  if (!anchor?.parentElement) {
    console.log('没有找到定位元素');
    return;
  }

  const container = document.createElement('div');
  Object.assign(container.style, {
    width: '100%',
    height: 'fit-content',
    padding: '0',
    margin: '0'
  });

  anchor.parentElement.appendChild(container);

  createRoot(container).render(createElement(App, { username }));

  console.log('图表初始化完成');
};

// ==================== 主入口 ====================
export default defineContentScript({
  matches: [
    '*://cn.v2ex.com/*',
    '*://de.v2ex.com/*',
    '*://fast.v2ex.com/*',
    '*://global.v2ex.com/*',
    '*://hk.v2ex.com/*',
    '*://jp.v2ex.com/*',
    '*://origin.v2ex.com/*',
    '*://s.v2ex.com/*',
    '*://staging.v2ex.com/*',
    '*://us.v2ex.com/*',
    '*://v2ex.com/*',
    '*://www.v2ex.com/*'
  ],
  main: async () => {
    console.log('V2EX Coins Extension: Content script loaded');

    const info = detectAndGetInfo();

    if (!info.isLoggedIn) {
      console.log('用户未登录，跳过');
      return;
    }

    if (info.isBalancePage) {
      console.log('金币页面，初始化图表');
      await initApp(info.username);
    }
    if (info.isV2ex) {
      initCollect(info.username);
    }
  }
}); 