import type { PageInfo } from '@/types/types';
import { initCollect } from '@/service/time/collect';
import { tryInitActivityBar } from '@/components/activity-bar';
import { tryInitBalanceChart } from '@/components/balance-chart';

// ==================== 页面检测和信息获取 ====================
const detectAndGetInfo = (): PageInfo => {
  const isV2ex = /\.{0,1}v2ex\.com$/.test(window.location.hostname);
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
      await tryInitBalanceChart(info.username);
    }

    if (info.isV2ex) {
      initCollect(info.username);
      await tryInitActivityBar(info.username);
    }
  }
}); 