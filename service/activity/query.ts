import { storage } from "@wxt-dev/storage";
import { Granularity, UsedTimeRecord } from "@/types/types";
import { aggreateByTime, aggregateByKey } from "@/service/data/aggregate";
import { fillGaps } from "@/service/data/fill";
import { getMonthStartTimestamp, getMonthEndTimestamp, getHourStartTimestamp } from "@/service/utils";
import { TimeSeriesRecord } from "@/service/data/types";
import { getGroupTimestamp } from "../data/common";

// ==================== 类型定义 ====================

// 小时级时间记录
interface HourlyRecord {
  hour: number;
  seconds: number;
}

// 月度聚合数据
interface MonthAggData {
  month: number;
  hourlyRecords: HourlyRecord[];
  dailyRecords: TimeSeriesRecord[];
}

// ==================== 常量配置 ====================

export const minimunTimeSpan = 30; // 最小记录间隔（秒）
export const throttleSeconds = 5; // 节流时间间隔（秒）

// ==================== 工具函数 ====================

// 获取最近的整点小时时间戳
const getNearestHour = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
};

// 获取当前月度记录的存储键
const getCurrentMonthKey = (username: string): StorageItemKey => {
  return `local:currentMonthTimeRecords:${username}`;
};

// ==================== 月份检测与数据压缩 ====================

// 检测是否进入新月份
const detectNewMonth = async (username: string): Promise<boolean> => {
  const currentMonthStart = getMonthStartTimestamp(Date.now());
  const recordedCurrentMonthStart = await storage.getItem<number>(`local:currentMonthStart:${username}`, { fallback: 0 });
  
  if (recordedCurrentMonthStart === 0) {
    await storage.setItem(`local:currentMonthStart:${username}`, currentMonthStart);
    return false;
  }
  
  // 新月份需要压缩历史记录  
  return recordedCurrentMonthStart !== currentMonthStart;
}

// 压缩历史月度记录为聚合数据
const compressMonthTimeRecord = async (username: string) => {
  let timeRecords = await storage.getItem<UsedTimeRecord[]>(getCurrentMonthKey(username));
  console.log('压缩月记录，查询结果:', timeRecords);
  
  if (!timeRecords || timeRecords.length === 0) {
    console.error('压缩月记录，未找到记录');
    return;
  }

  // 获取需要压缩的时间范围
  const recordedCurrentMonthStart = await storage.getItem<number>(`local:currentMonthStart:${username}`, { fallback: 0 });
  if (recordedCurrentMonthStart === 0) {
    console.error('压缩月记录，未找到 currentMonthStart');
    return;
  }

  const recordedCurrentMonthEnd = getMonthEndTimestamp(recordedCurrentMonthStart);
  
  // 筛选需要压缩和保留的记录
  const needCompressed = (record: UsedTimeRecord) => record.timestamp <= recordedCurrentMonthEnd;
  const needCompressedRecords = timeRecords.filter(needCompressed);
  const resetRecords = timeRecords.filter(record => !needCompressed(record));
  
  console.log('压缩月记录，需要压缩的记录:', needCompressedRecords);
  console.log('压缩月记录，需要保留的记录:', resetRecords);
  
  if (needCompressedRecords.length === 0) {
    console.log('压缩月记录，没有需要压缩的记录');
    return;
  }

  // 生成小时粒度聚合数据
  const hourlyKey = (record: UsedTimeRecord) => new Date(record.timestamp).getHours();
  const hourlyAggregator = (hour: number, group: UsedTimeRecord[]): HourlyRecord => ({
    hour,
    seconds: group.reduce((acc, record) => acc + record.seconds, 0),
  });
  const aggHourlyRecords = aggregateByKey(needCompressedRecords, hourlyKey, hourlyAggregator);
  console.log('压缩月记录，压缩后的小时维度记录:', aggHourlyRecords);

  // 生成天粒度聚合数据
  const dailyAggregator = (timestamp: number, group: UsedTimeRecord[]): UsedTimeRecord => ({
    timestamp,
    seconds: group.reduce((acc, record) => acc + record.seconds, 0),
  });
  const aggDailyRecords = aggreateByTime(needCompressedRecords, 'day', dailyAggregator);
  console.log('压缩月记录，压缩后的天维度记录:', aggDailyRecords);

  // 构建月度聚合数据
  const monthAggData: MonthAggData = {
    month: new Date(recordedCurrentMonthStart).getMonth(),
    hourlyRecords: aggHourlyRecords,
    dailyRecords: aggDailyRecords,
  };

  // 保存到年度聚合数据中
  const year = new Date(recordedCurrentMonthStart).getFullYear();
  const currentYearMonthAggDataKey: StorageItemKey = `local:currentYearMonthAggData:${username}:${year}`;
  const currentYearMonthAggData = await storage.getItem<MonthAggData[]>(currentYearMonthAggDataKey);
  
  console.log('压缩月记录，查询年记录:', currentYearMonthAggData);
  
  if (!currentYearMonthAggData) {
    await storage.setItem(currentYearMonthAggDataKey, [monthAggData]);
  } else {
    currentYearMonthAggData.push(monthAggData);
    await storage.setItem(currentYearMonthAggDataKey, currentYearMonthAggData);
  }

  // 更新当前月份起始时间
  await storage.setItem(`local:currentMonthStart:${username}`, getMonthStartTimestamp(Date.now()));

  // 更新当前月份记录
  await storage.setItem(getCurrentMonthKey(username), resetRecords);
}

// ==================== 数据更新 ====================

// 更新用户月度时间记录
const updateMonthTimeRecord = async (username: string, record: UsedTimeRecord) => {
  // 防重复提交检查
  const lastUpdateTime = await storage.getItem<number>(`${getCurrentMonthKey(username)}:version`, { fallback: 0 });
  const gap = record.timestamp - lastUpdateTime;
  console.log(`更新版本, 更新前版本 ${lastUpdateTime}, 更新后版本 ${record.timestamp}, 间隔 ${gap / 1000} 秒`);
  
  if (gap < minimunTimeSpan * 1000) {
    console.log('重复记录，跳过', record);
    return;
  }
  
  await storage.setItem(`${getCurrentMonthKey(username)}:version`, record.timestamp);

  // 检测新月份并压缩历史数据
  if (await detectNewMonth(username)) {
    await compressMonthTimeRecord(username);
  }

  let timeRecords = await storage.getItem<UsedTimeRecord[]>(getCurrentMonthKey(username));
  console.log('更新月记录，查询结果:', timeRecords, '新记录:', record);

  // 初始化第一条记录
  if (!timeRecords || timeRecords.length === 0) {
    timeRecords = [{ timestamp: getNearestHour(record.timestamp), seconds: record.seconds }];
    await storage.setItem(getCurrentMonthKey(username), timeRecords);
    return;
  }

  // 保持数据有序
  timeRecords.sort((a, b) => a.timestamp - b.timestamp);
  const latestRecord = timeRecords[timeRecords.length - 1];

  // 同一小时累加，否则新增记录
  if (latestRecord.timestamp === getNearestHour(record.timestamp)) {
    latestRecord.seconds += record.seconds;
  } else {
    timeRecords.push({ timestamp: getNearestHour(record.timestamp), seconds: record.seconds });
  }

  console.log('更新月记录, 更新后', timeRecords);
  await storage.setItem(getCurrentMonthKey(username), timeRecords);
};

// ==================== 数据查询 ====================

// 获取用户今日总使用时间（秒）
const getTodayTotalUsedSeconds = async (username: string) => {
  const timeRecords = await storage.getItem<UsedTimeRecord[]>(getCurrentMonthKey(username));

  if (!timeRecords || timeRecords.length === 0) {
    return 0;
  }

  // 计算今日时间范围
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  // 筛选今日记录并累加时间
  const todayRecords = timeRecords.filter((record) =>
    record.timestamp >= todayStart.getTime() && record.timestamp <= todayEnd.getTime()
  );

  return todayRecords.reduce((acc, record) => acc + record.seconds, 0);
};

// 获取指定时间范围的聚合使用时间记录
const getAggregatedUsedTimeRecords = async (username: string, granularity: Granularity, start: number, end: number): Promise<UsedTimeRecord[]> => {
  const timeRecords = await storage.getItem<UsedTimeRecord[]>(getCurrentMonthKey(username));
  if (!timeRecords || timeRecords.length === 0) {
    return [];
  }

  // 筛选时间范围内的记录
  const filteredRecords = timeRecords.filter((record) => record.timestamp >= start && record.timestamp <= end);
  
  // 按指定粒度聚合数据
  const aggregatedRecords = aggreateByTime(filteredRecords, granularity, (timestamp, group) => ({
    timestamp,
    seconds: group.reduce((acc, record) => acc + record.seconds, 0),
  }));
  
  aggregatedRecords.sort((a, b) => a.timestamp - b.timestamp);

  // 填充数据空隙
  const result = fillGaps(aggregatedRecords, granularity, start, end, (timestamp, leftRecord) => ({
    timestamp,
    seconds: 0,
  }));

  return result;
};

// ==================== 导出接口 ====================

export {
  updateMonthTimeRecord,
  getTodayTotalUsedSeconds,
  getAggregatedUsedTimeRecords,
  getCurrentMonthKey,
  compressMonthTimeRecord,
};

// 导出测试需要的类型
export type { HourlyRecord, MonthAggData };