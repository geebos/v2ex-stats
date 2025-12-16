import type { PageInfo } from '@/types/types';
import { initCollect } from '@/service/activity/collect';
import { tryInitActivityBar } from '@/components/activity-bar';
import { tryInitBalanceChart } from '@/components/balance-chart';
import { tryInitActivityChart } from '@/components/activity-chart';
import { testIsV2EX } from '@/service/utils';
import { collectPostInfo } from '@/service/history/collect';
import { tryInitUI } from '@/ui';
import { tryInitAnnualSummaryButton } from '@/components/annual-summary-button';
import { showAnnualSummaryModal } from '@/components/annual-summary-modal';
import { showAnnualDataInitModal } from '@/components/annual-data-init-modal';
import { generateAnnualSummary, getNearestYear } from '@/service/summary';
import { initNewBalanceRecords } from '@/service/balance/crawler';
import { getAnnualReportInited, setAnnualReportInited } from '@/service/storage';

// ==================== 页面检测和信息获取 ====================

export const detectAndGetInfo = (): PageInfo => {
  const isV2ex = testIsV2EX(window.location.hostname);

  const memberLink = Array.from(document.querySelectorAll('#Top a'))
    .find(a => /^\/member\/[\w-]+$/.test(a.getAttribute('href') || '')) as HTMLAnchorElement | undefined;

  const isLoggedIn = !!memberLink;
  const username = isLoggedIn && memberLink
    ? memberLink.href.split('/').pop()?.trim() ?? ''
    : '';

  const pathname = window.location.pathname;

  const info: PageInfo = { isV2ex, isLoggedIn, username, pathname };
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

    if (info.pathname === '/balance') {
      await tryInitBalanceChart(info.username);
    }

    if (info.isV2ex) {
      initCollect(info.username);
      await tryInitActivityBar(info.username);
    }

    if (info.pathname === `/member/${info.username}`) {
      await tryInitActivityChart(info.username);
    }

    await collectPostInfo(info.username);
    await tryInitUI(info.username);

    await tryInitAnnualSummaryButton(info.username, async () => {
      try {
        const targetYear = getNearestYear();
        
        // 检查年度报告数据是否已初始化（使用年度报告专用标记）
        const isInited = await getAnnualReportInited(info.username, targetYear);
        console.log('[年度报告] 数据是否已初始化:', isInited);
        
        if (!isInited) {
          // 未初始化，弹窗请求用户同意
          console.log('[年度报告] 数据未初始化，需要用户确认');
          const confirmed = await showAnnualDataInitModal(info.username, targetYear);
          
          if (!confirmed) {
            console.log('[年度报告] 用户取消初始化');
            return;
          }
          
          console.log('[年度报告] 数据初始化完成');
        } else {
          // 已初始化，静默更新最新数据
          console.log('[年度报告] 更新最新数据');
          await initNewBalanceRecords(info.username);
        }
        
        // 生成并展示年度报告
        const summaryData = await generateAnnualSummary(info.username, targetYear);
        showAnnualSummaryModal(summaryData);
      } catch (error) {
        console.error('生成年终总结失败:', error);
      }
    });
  }
}); 