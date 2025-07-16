import { parseBalanceMaxPage, startCrawler } from "@/service/crawler";
import { sendMessage } from "webext-bridge/content-script";
import type { PageInfo } from "@/types/types";

export default defineContentScript({
  matches: ['*://v2ex.com/*'],
  main: async () => {
    console.log('V2EX Coins Extension: Content script loaded async');

    // 检测并获取信息
    const info = detectAndGetInfo();
    if (info.isBalancePage) {
      const maxPage = parseBalanceMaxPage(document);
      console.log('最大分页:', maxPage);

      const isInited = await sendMessage('getIsInited', undefined, 'background');
      console.log('是否已初始化:', isInited);

      const records = await sendMessage('getBalanceRecords', { username: info.username }, 'background');
      console.log('余额历史数据:', records);

      if (!isInited) {
        console.log('开始初始化余额历史数据');
        await startCrawler(maxPage, (page, records) => {
          console.log('抓取结果, 第' + page + '页:', records);
          sendMessage('appendBalanceRecords', { username: info.username, records }, 'background');
        });
        await sendMessage('setIsInited', { isInited: true }, 'background');
      } else {
        console.log('余额历史数据已初始化');
      }
    }
  },
});

/**
 * 检测并获取信息
 */
function detectAndGetInfo() {
  // 3.1.1 检查域名是否为 v2ex.com
  const isV2ex = window.location.hostname === "v2ex.com";
  console.log('是否为 V2EX 网站:', isV2ex);

  // 3.1.2 检查打开的 URL 是否为金币页面
  const isBalancePage = window.location.pathname === "/balance";
  console.log('是否为金币页面:', isBalancePage);

  // 3.1.3 检测用户是否登录
  const memberLink = Array.from(document.querySelectorAll('a'))
    .find(a => /^\/member\/[\w-]+$/.test(a.getAttribute('href') || ''));

  const isLoggedIn = !!memberLink;
  console.log('用户是否已登录:', isLoggedIn);

  // 获取用户名
  let username = '';
  if (isLoggedIn && memberLink) {
    username = memberLink.href.split('/').pop()?.trim() ?? '';
    console.log('用户名:', username);
  }

  // 汇总信息
  const info: PageInfo = {
    isV2ex: isV2ex,
    isBalancePage: isBalancePage,
    isLoggedIn: isLoggedIn,
    username: username
  };

  console.log('检测到的信息汇总:', info);
  return info;
}
