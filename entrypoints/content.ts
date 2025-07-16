import { parseBalanceMaxPage, startCrawler } from "@/service/crawler";

export default defineContentScript({
  matches: ['*://v2ex.com/*'],
  main() {
    console.log('V2EX Coins Extension: Content script loaded');
    
    // 检测并获取信息
    const info = detectAndGetInfo();
    if(info.isBalancePage) {
      const maxPage = parseBalanceMaxPage(document);
      console.log('最大分页:', maxPage);
      startCrawler(2, (page, records)=>{
        console.log('抓取结果, 第' + page + '页:', records);
      });
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
  if (isLoggedIn && memberLink) {
    const username = memberLink.href.split('/').pop()?.trim();
    console.log('用户名:', username);
    
    // 汇总信息
    const info = {
      isV2ex,
      isBalancePage,
      isLoggedIn,
      username
    };
    
    console.log('检测到的信息汇总:', info);
    
    return info;
  } else {
    console.log('用户未登录，无法获取用户名');
    
    // 汇总信息
    const info = {
      isV2ex,
      isBalancePage,
      isLoggedIn,
      username: null
    };
    
    console.log('检测到的信息汇总:', info);
    
    return info;
  }
}
