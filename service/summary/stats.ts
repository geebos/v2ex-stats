import { getAllBalanceRecords, queryBalanceRecords } from '@/service/balance/query';
import type { BalanceRecord, BRTypeEnum } from '@/types/types';
import {
  BRTypeDailyLogin,
  BRTypeDailyActivity,
  BRTypeConsecutiveLogin,
  BRTypeCreateReply,
  BRTypeCreateTopic,
  BRTypeSendThanks,
  BRTypeReceiveThanks,
  BRTypeCreateAppendix,
  BRTypeEditTopic,
} from '@/types/types';
import type {
  AnnualSummaryStats,
  LoginStats,
  ReplyStats,
  PostStats,
  ThankStats,
  ReceivedThankStats,
  BalanceStats,
  ActivityHeatmapStats,
  TimeDistribution,
} from '@/types/summary';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getTimeDistribution(records: BalanceRecord[]): TimeDistribution {
  const byMonth: Record<number, number> = {};
  const byWeekday: Record<number, number> = {};
  const byHour: Record<number, number> = {};

  records.forEach(record => {
    const date = new Date(record.timestamp);
    const month = date.getMonth();
    const weekday = date.getDay();
    const hour = date.getHours();

    byMonth[month] = (byMonth[month] || 0) + 1;
    byWeekday[weekday] = (byWeekday[weekday] || 0) + 1;
    byHour[hour] = (byHour[hour] || 0) + 1;
  });

  const peakHour = Object.entries(byHour).reduce((max, [hour, count]) =>
    count > max.count ? { hour: parseInt(hour), count } : max,
    { hour: 0, count: 0 }
  ).hour;

  const peakWeekday = Object.entries(byWeekday).reduce((max, [weekday, count]) =>
    count > max.count ? { weekday: parseInt(weekday), count } : max,
    { weekday: 0, count: 0 }
  ).weekday;

  return { byMonth, byWeekday, byHour, peakHour, peakWeekday };
}

function calculateConsecutiveDays(records: BalanceRecord[]): number {
  if (records.length === 0) return 0;

  const sortedRecords = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const dates = sortedRecords.map(r => {
    const d = new Date(r.timestamp);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  });

  const uniqueDates = [...new Set(dates)].sort((a, b) => a - b);
  if (uniqueDates.length === 0) return 0;

  let maxConsecutive = 1;
  let currentConsecutive = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diffDays = (uniqueDates[i] - uniqueDates[i - 1]) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }

  return maxConsecutive;
}

export async function calculateAnnualSummaryStats(
  username: string,
  startDate: number,
  endDate: number
): Promise<AnnualSummaryStats> {
  const allRecords = await getAllBalanceRecords(username);
  const records = allRecords.filter(r => r.timestamp >= startDate && r.timestamp <= endDate);

  const dailyLoginRecords = records.filter(r => r.type === BRTypeDailyLogin);
  const loginRecords = records.filter(r => r.type === BRTypeDailyLogin || r.type === BRTypeDailyActivity || r.type === BRTypeConsecutiveLogin);
  const replyRecords = records.filter(r => r.type === BRTypeCreateReply);
  const postRecords = records.filter(r => r.type === BRTypeCreateTopic);
  const thankRecords = records.filter(r => r.type === BRTypeSendThanks);
  const receivedThankRecords = records.filter(r => r.type === BRTypeReceiveThanks);

  const loginStats: LoginStats = {
    totalCount: dailyLoginRecords.length,
    totalCoins: loginRecords.reduce((sum, r) => sum + r.delta, 0),
    avgCoinsPerLogin: dailyLoginRecords.length > 0
      ? loginRecords.reduce((sum, r) => sum + r.delta, 0) / dailyLoginRecords.length
      : 0,
    consecutiveDays: calculateConsecutiveDays(dailyLoginRecords),
    timeDistribution: getTimeDistribution(loginRecords),
  };

  const replyStats: ReplyStats = {
    totalCount: replyRecords.length,
    totalCoinsSpent: Math.abs(replyRecords.reduce((sum, r) => sum + r.delta, 0)),
    avgCoinsPerReply: replyRecords.length > 0
      ? Math.abs(replyRecords.reduce((sum, r) => sum + r.delta, 0)) / replyRecords.length
      : 0,
    timeDistribution: getTimeDistribution(replyRecords),
  };

  const postStats: PostStats = {
    totalCount: postRecords.length,
    totalCoinsSpent: Math.abs(postRecords.reduce((sum, r) => sum + r.delta, 0)),
    avgCoinsPerPost: postRecords.length > 0
      ? Math.abs(postRecords.reduce((sum, r) => sum + r.delta, 0)) / postRecords.length
      : 0,
    timeDistribution: getTimeDistribution(postRecords),
  };

  const thankStats: ThankStats = {
    totalCount: thankRecords.length,
    totalCoinsSpent: Math.abs(thankRecords.reduce((sum, r) => sum + r.delta, 0)),
    avgCoinsPerThank: thankRecords.length > 0
      ? Math.abs(thankRecords.reduce((sum, r) => sum + r.delta, 0)) / thankRecords.length
      : 0,
    topThankedUsers: [],
    timeDistribution: getTimeDistribution(thankRecords),
  };

  const receivedThankStats: ReceivedThankStats = {
    totalCount: receivedThankRecords.length,
    totalCoinsReceived: receivedThankRecords.reduce((sum, r) => sum + r.delta, 0),
    avgCoinsPerThank: receivedThankRecords.length > 0
      ? receivedThankRecords.reduce((sum, r) => sum + r.delta, 0) / receivedThankRecords.length
      : 0,
    topThankedPosts: [],
    topThankedComments: [],
  };

  const incomeRecords = records.filter(r => r.delta > 0);
  const expenseRecords = records.filter(r => r.delta < 0);

  const incomeByType: Record<string, number> = {};
  incomeRecords.forEach(r => {
    incomeByType[r.type] = (incomeByType[r.type] || 0) + r.delta;
  });

  const expenseByType: Record<string, number> = {};
  expenseRecords.forEach(r => {
    expenseByType[r.type] = (expenseByType[r.type] || 0) + Math.abs(r.delta);
  });

  const balanceStats: BalanceStats = {
    totalIncome: incomeRecords.reduce((sum, r) => sum + r.delta, 0),
    totalExpense: Math.abs(expenseRecords.reduce((sum, r) => sum + r.delta, 0)),
    netChange: records.reduce((sum, r) => sum + r.delta, 0),
    incomeByType,
    expenseByType,
  };

  const activityHeatmapStats = calculateActivityHeatmap(records);

  return {
    login: loginStats,
    reply: replyStats,
    post: postStats,
    thank: thankStats,
    receivedThank: receivedThankStats,
    balance: balanceStats,
    activityHeatmap: activityHeatmapStats,
  };
}

// 用户主动触发的记录类型
const ACTIVE_RECORD_TYPES: (BRTypeEnum | string)[] = [
  BRTypeCreateReply, BRTypeCreateTopic, BRTypeSendThanks, BRTypeCreateAppendix, BRTypeEditTopic,
  BRTypeDailyLogin, BRTypeDailyActivity, BRTypeConsecutiveLogin,
];

function calculateActivityHeatmap(records: BalanceRecord[]): ActivityHeatmapStats {
  const data: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

  const activeRecords = records.filter(r => ACTIVE_RECORD_TYPES.includes(r.type));

  activeRecords.forEach(record => {
    const date = new Date(record.timestamp);
    const weekday = date.getDay();
    const hour = date.getHours();
    data[weekday][hour]++;
  });

  const maxValue = Math.max(...data.flat());

  return { data, maxValue };
}

export function getDefaultDateRange(): { startDate: number; endDate: number } {
  const endDate = Date.now();
  const startDate = endDate - ONE_YEAR_MS;
  return { startDate, endDate };
}

/**
 * 计算距离最近的年份
 * 如果当前月份小于6（1-5月），使用上一年的年份
 * 否则使用当前年的年份
 */
export function getNearestYear(): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() 返回 0-11
  const currentYear = now.getFullYear();
  
  return currentMonth < 6 ? currentYear - 1 : currentYear;
}
