import { parseBalanceMaxPage, startCrawler } from "@/service/crawler";
import { sendMessage } from "webext-bridge/content-script";
import type { BalanceRecord, PageInfo } from "@/types/types";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import Chart from "@/components/chart";
import { BalanceRecordQuery } from "@/types/shim";

// ============================================================================
// 主要入口点 - Content Script 定义
// ============================================================================

export default defineContentScript({
  matches: ['*://v2ex.com/*'],
  main: async () => {
    console.log('V2EX Coins Extension: Content script loaded async');

    // 检测并获取页面信息
    const info = detectAndGetInfo();

    if (!info.isBalancePage) {
      console.log('不是金币页面，不进行抓取');
      return;
    }

    const maxPage = parseBalanceMaxPage(document);
    console.log('最大分页:', maxPage);

    const isInited = await sendMessage('getIsInited', undefined, 'background');
    console.log('是否已初始化:', isInited);

    // 根据初始化状态决定执行哪种抓取策略
    if (!isInited) {
      await initBalanceRecords(maxPage, info.username);
    } else {
      await initNewBalanceRecords(maxPage, info.username);
    }

    await initChart(info.username);
  },
});

// ============================================================================
// 页面检测和信息获取
// ============================================================================

/**
 * 检测并获取页面相关信息
 * @returns {PageInfo} 页面信息对象，包含域名、页面类型、登录状态和用户名
 */
function detectAndGetInfo(): PageInfo {
  // 检查域名是否为 v2ex.com
  const isV2ex = window.location.hostname === "v2ex.com";
  console.log('是否为 V2EX 网站:', isV2ex);

  // 检查打开的 URL 是否为金币页面
  const isBalancePage = window.location.pathname === "/balance";
  console.log('是否为金币页面:', isBalancePage);

  // 检测用户是否登录并获取用户名
  const memberLink = Array.from(document.querySelectorAll('a'))
    .find(a => /^\/member\/[\w-]+$/.test(a.getAttribute('href') || ''));

  const isLoggedIn = !!memberLink;
  console.log('用户是否已登录:', isLoggedIn);

  // 提取用户名
  let username = '';
  if (isLoggedIn && memberLink) {
    username = memberLink.href.split('/').pop()?.trim() ?? '';
    console.log('用户名:', username);
  }

  // 汇总页面信息
  const info: PageInfo = {
    isV2ex: isV2ex,
    isBalancePage: isBalancePage,
    isLoggedIn: isLoggedIn,
    username: username
  };

  console.log('检测到的信息汇总:', info);
  return info;
}

// ============================================================================
// 数据初始化和抓取逻辑
// ============================================================================

/**
 * 初始化余额历史数据（首次抓取）
 * @param {number} maxPage - 最大页数
 * @param {string} username - 用户名
 */
async function initBalanceRecords(maxPage: number, username: string): Promise<void> {
  console.log('开始初始化余额历史数据');

  await startCrawler(maxPage, username, (page, records) => {
    console.log('抓取结果, 第' + page + '页:', records);
    sendMessage('appendBalanceRecords', { records }, 'background');
    return true;
  });

  // 标记为已初始化
  await sendMessage('setIsInited', { isInited: true }, 'background');
  console.log('初始化余额历史数据完成');
}

/**
 * 增量抓取新的余额历史数据
 * @param {number} maxPage - 最大页数
 * @param {string} username - 用户名
 */
async function initNewBalanceRecords(maxPage: number, username: string): Promise<void> {
  // 获取已存储的余额记录
  const latestRecord = await sendMessage('getLatestBalanceRecord', { username: username }, 'background');
  const latestTimestamp = latestRecord?.timestamp ?? 0;

  console.log('最新余额记录:', latestRecord);
  console.log('开始增量抓取余额历史数据, 最新时间戳:', latestTimestamp);

  await startCrawler(maxPage, username, (page, records) => {
    console.log('抓取结果, 第' + page + '页:', records);

    // 过滤出新记录（时间戳大于等于最新记录的时间戳）
    const newRecords: BalanceRecord[] = [];
    for (const record of records) {
      if (latestTimestamp <= record.timestamp) {
        newRecords.push(record);
      }
    }

    // 如果有新记录，保存并继续抓取
    if (newRecords.length > 0) {
      sendMessage('appendBalanceRecords', { records: newRecords }, 'background');
      return newRecords.length == records.length;
    }

    return false;
  });

  console.log('增量抓取余额历史数据完成');
}

async function initChart(username: string) {
  const anchor = document.querySelector('div.balance_area');
  if (!anchor) {
    console.log('没有找到定位元素');
    return;
  }
  console.log('找到定位元素, 开始初始化图表');
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = 'fit-content';
  container.style.padding = '0';
  container.style.margin = '0';
  anchor.parentElement?.appendChild(container);
  createRoot(container).render(createElement(Chart, {
    username,
    query: async (query: BalanceRecordQuery) => {
      return await sendMessage('queryBalanceRecords', query, 'background');
    }
  }));
  console.log('图表初始化完成');
} 