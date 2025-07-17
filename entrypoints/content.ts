import { parseBalanceMaxPage, startCrawler } from "@/service/crawler";
import { sendMessage } from "webext-bridge/content-script";
import type { BalanceRecord, PageInfo } from "@/types/types";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import Chart from "@/components/chart";
import { BalanceRecordQuery } from "@/types/shim";

// ==================== 页面检测和信息获取 ====================
const detectAndGetInfo = (): PageInfo => {
  const isV2ex = window.location.hostname === "v2ex.com";
  const isBalancePage = window.location.pathname === "/balance";
  
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

// ==================== 数据抓取逻辑 ====================
const initBalanceRecords = async (maxPage: number, username: string): Promise<void> => {
  console.log('开始初始化余额历史数据, 最大页数:', maxPage);

  await startCrawler(maxPage, username, (page, records) => {
    console.log(`抓取第${page}页:`, records.length, '条记录');
    sendMessage('appendBalanceRecords', { records }, 'background');
    return true;
  });

  await sendMessage('setIsInited', { isInited: true }, 'background');
  console.log('初始化余额历史数据完成');
};

const initNewBalanceRecords = async (maxPage: number, username: string): Promise<void> => {
  const latestRecord = await sendMessage('getLatestBalanceRecord', { username }, 'background');
  const latestTimestamp = latestRecord?.timestamp ?? 0;
  
  console.log('开始增量抓取, 最新时间戳:', latestTimestamp);

  await startCrawler(maxPage, username, (page, records) => {
    const newRecords = records.filter(record => record.timestamp >= latestTimestamp);
    
    if (newRecords.length > 0) {
      console.log(`抓取第${page}页: 新增${newRecords.length}/${records.length}条记录`);
      sendMessage('appendBalanceRecords', { records: newRecords }, 'background');
      return newRecords.length === records.length;
    }
    
    return false;
  });

  console.log('增量抓取完成');
};

// ==================== 图表初始化 ====================
const initChart = async (username: string, isDoingInit: boolean) => {
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
  
  createRoot(container).render(createElement(Chart, {
    username,
    isDoingInit,
    query: async (query: BalanceRecordQuery) => 
      await sendMessage('queryBalanceRecords', query, 'background')
  }));

  console.log('图表初始化完成');
};

// ==================== 主入口 ====================
export default defineContentScript({
  matches: ['*://v2ex.com/*'],
  main: async () => {
    console.log('V2EX Coins Extension: Content script loaded');

    const info = detectAndGetInfo();
    
    if (!info.isBalancePage) {
      console.log('不是金币页面，跳过');
      return;
    }

    const maxPage = parseBalanceMaxPage(document);
    const isInited = await sendMessage('getIsInited', undefined, 'background');
    
    console.log('最大页数:', maxPage, '已初始化:', isInited);

    await initChart(info.username, !isInited);

    if (!isInited) {
      await initBalanceRecords(maxPage, info.username);
    } else {
      await initNewBalanceRecords(maxPage, info.username);
    }
  },
}); 