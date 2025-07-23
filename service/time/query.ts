import { UsedTimeRecord } from "@/types/types";
import { storage } from "@wxt-dev/storage";

/*
数据存储策略：
每月一个 key，保存小时粒度的详细数据
每年一个 key，保存天粒度的详细数据，小时粒度的聚合数据
*/

// ==================== 常量 ====================

export const minimunTimeSpan = 30; // 最小记录间隔（秒），避免重复提交
export const throttleSeconds = 5; // 节流时间间隔（秒）

// ==================== 工具函数 ====================

// 将时间戳转换为最近的整点小时时间戳
const getNearestHour = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
};

// ==================== 数据更新 ====================

// 更新用户月度时间记录，同一小时累加否则创建新记录
const updateMonthTimeRecord = async (username: string, record: UsedTimeRecord) => {
  const lastUpdateTime = await storage.getItem<number>(`local:monthTimeRecords:${username}:version`, { fallback: 0 });
  const gap = record.timestamp - lastUpdateTime;
  console.log(`更新版本, 更新前版本 ${lastUpdateTime}, 更新后版本 ${record.timestamp}, 间隔 ${gap / 1000} 秒`);
  if (gap < minimunTimeSpan * 1000) {
    console.log('重复记录，跳过', record);
    return;
  }
  await storage.setItem(`local:monthTimeRecords:${username}:version`, record.timestamp);

  let timeRecords = await storage.getItem<UsedTimeRecord[]>(`local:monthTimeRecords:${username}`);
  console.log('更新月记录，查询结果:', timeRecords, '新记录:', record);

  // 如果没有历史记录，创建第一条记录
  if (timeRecords === null || timeRecords?.length === 0) {
    timeRecords = [{ timestamp: getNearestHour(record.timestamp), seconds: record.seconds }];
    await storage.setItem(`local:monthTimeRecords:${username}`, timeRecords);
    return;
  }

  // 按时间戳排序，确保数据有序
  timeRecords.sort((a, b) => a.timestamp - b.timestamp);
  const latestRecord = timeRecords[timeRecords.length - 1];

  // 如果是同一小时，累加时间；否则添加新记录
  if (latestRecord.timestamp === getNearestHour(record.timestamp)) {
    latestRecord.seconds += record.seconds;
  } else {
    timeRecords.push({ timestamp: getNearestHour(record.timestamp), seconds: record.seconds });
  }

  console.log('更新月记录, 更新后', timeRecords);
  await storage.setItem(`local:monthTimeRecords:${username}`, timeRecords);
};

// ==================== 数据查询 ====================

// 获取用户今日总使用时间（秒）
const getTodayTotalUsedSeconds = async (username: string) => {
  const timeRecords = await storage.getItem<UsedTimeRecord[]>(`local:monthTimeRecords:${username}`);

  if (timeRecords === null || timeRecords?.length === 0) {
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

export { updateMonthTimeRecord, getTodayTotalUsedSeconds };