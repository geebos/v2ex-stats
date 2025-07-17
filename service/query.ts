import type { BalanceRecord } from "@/types/types";
import { storage } from "@wxt-dev/storage";

// ============================================================================
// 键值生成和管理函数
// ============================================================================

/**
 * 生成分片键，基于记录的年月进行分片
 * @param {BalanceRecord} record - 余额记录
 * @returns {string} 分片键，格式为 "年|月"
 */
function getShardingKey(record: BalanceRecord): string {
  const date = new Date(record.timestamp);
  return `${date.getUTCFullYear()}|${date.getUTCMonth().toString().padStart(2, '0')}`;
}

/**
 * 生成存储键，用于在本地存储中标识特定用户的特定时间段数据
 * @param {BalanceRecord} record - 余额记录
 * @returns {string} 存储键，格式为 "用户名|分片键"
 */
function getStorageKey(record: BalanceRecord): string {
  return `${record.username}|${getShardingKey(record)}`;
}

/**
 * 生成唯一键，用于数据去重
 * @param {BalanceRecord} record - 余额记录
 * @returns {string} 唯一键，格式为 "时间戳|余额|用户名"
 */
function getUniqueKey(record: BalanceRecord): string {
  return `${record.timestamp}|${record.balance}|${record.username}`;
}

// ============================================================================
// 数据去重和处理函数
// ============================================================================

/**
 * 对余额记录进行去重，并按时间戳降序排序
 * @param {BalanceRecord[]} records - 余额记录数组
 * @returns {BalanceRecord[]} 去重后按时间倒序排列的记录数组
 */
function getUniqueBalanceRecords(records: BalanceRecord[]): BalanceRecord[] {
  const uniqueMap = new Map<string, BalanceRecord>();

  // 使用 Map 进行去重，相同唯一键的记录会被覆盖
  for (const record of records) {
    uniqueMap.set(getUniqueKey(record), record);
  }

  // 按时间戳降序排序（最新的在前）
  return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================================
// 数据存储操作函数
// ============================================================================

/**
 * 追加余额记录到本地存储
 * 使用分片策略，按用户和时间进行数据分片存储
 * @param {BalanceRecord[]} records - 要追加的余额记录数组
 */
async function appendBalanceRecords(records: BalanceRecord[]): Promise<void> {
  if (records.length === 0) return;

  // 按存储键对记录进行分组
  const storageMap = new Map<string, BalanceRecord[]>();
  for (const record of records) {
    const key = getStorageKey(record);
    const records = storageMap.get(key) ?? [];
    records.push(record);
    storageMap.set(key, records);
  }

  // 为每个分片更新存储数据
  for (const [key, records] of storageMap) {
    // 获取已存储的记录
    const storageRecords = await storage.getItem<BalanceRecord[]>(`local:balanceRecords:${key}`);

    // 合并新旧记录并去重
    const uniqueRecords = getUniqueBalanceRecords([...(storageRecords ?? []), ...records]);

    // 保存去重后的记录
    await storage.setItem(`local:balanceRecords:${key}`, uniqueRecords);
  }

  // 更新用户的分片列表
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${records[0].username}`;
  let shardings = await storage.getItem<string[]>(shardingListKey, { fallback: [] });

  // 添加新的分片键到列表中
  shardings.push(...Array.from(storageMap.keys()).map(key => `local:balanceRecords:${key}`));
  shardings = Array.from(new Set(shardings)); // 去重

  console.log('shardings', shardings);
  await storage.setItem(shardingListKey, shardings);
}

// ============================================================================
// 内部工具函数
// ============================================================================

/**
 * 根据聚合粒度生成标准化时间戳
 * 将任意时间戳标准化为对应时间段的开始时间
 * 
 * @param timestamp - 原始时间戳
 * @param granularity - 聚合粒度
 * @returns 标准化后的时间戳（时间段开始时间）
 */
function getGroupTimestamp(timestamp: number, granularity: 'minute' | 'hour' | 'day' | 'month' | 'year'): number {
  const date = new Date(timestamp);
  switch (granularity) {
    case 'minute':
      // 标准化到分钟开始：保留年月日时分，秒和毫秒归零
      return new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
        date.getUTCHours(), date.getUTCMinutes(), 0, 0
      )).getTime();
    case 'hour':
      // 标准化到小时开始：保留年月日时，分秒毫秒归零
      return new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
        date.getUTCHours(), 0, 0, 0
      )).getTime();
    case 'day':
      // 标准化到天开始：保留年月日，时分秒毫秒归零
      return new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
        0, 0, 0, 0
      )).getTime();
    case 'month':
      // 标准化到月开始：保留年月，日设为1，时分秒毫秒归零
      return new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0
      )).getTime();
    case 'year':
      // 标准化到年开始：保留年，月日时分秒毫秒全部归零
      return new Date(Date.UTC(
        date.getUTCFullYear(), 0, 1, 0, 0, 0, 0
      )).getTime();
  }
}

/**
 * 生成指定粒度的下一个时间戳
 * 
 * @param timestamp - 当前时间戳
 * @param granularity - 聚合粒度
 * @returns 下一个时间段的时间戳
 */
function getNextTimestamp(timestamp: number, granularity: 'minute' | 'hour' | 'day' | 'month' | 'year'): number {
  switch (granularity) {
    case 'minute':
      return timestamp + 60 * 1000;
    case 'hour':
      return timestamp + 60 * 60 * 1000;
    case 'day':
      return timestamp + 24 * 60 * 60 * 1000;
    case 'month': {
      const date = new Date(timestamp);
      return new Date(Date.UTC(
        date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0
      )).getTime();
    }
    case 'year': {
      const date = new Date(timestamp);
      return new Date(Date.UTC(
        date.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0
      )).getTime();
    }
    default:
      return timestamp;
  }
}

/**
 * 填充时间序列中的空缺，生成完整的时间序列
 * 支持指定时间范围的完整插值
 * 
 * @param aggregatedRecords - 已聚合的记录数组
 * @param granularity - 聚合粒度
 * @param start - 开始时间戳，如果不为 0 则从此时间开始插值
 * @param end - 结束时间戳，如果不为 0 则到此时间结束插值
 * @returns 填充后的完整时间序列
 */
function fillTimeSeriesGaps(
  aggregatedRecords: BalanceRecord[], 
  granularity: 'minute' | 'hour' | 'day' | 'month' | 'year',
  start: number,
  end: number
): BalanceRecord[] {
  if (aggregatedRecords.length === 0 && start === 0 && end === 0) return [];
  
  // 确保按时间戳升序排序
  const sortedRecords = aggregatedRecords.sort((a, b) => a.timestamp - b.timestamp);
  
  // 确定时间范围
  let actualStart: number;
  let actualEnd: number;
  
  if (start !== 0 && end !== 0) {
    // 如果指定了完整的时间范围，使用指定范围
    actualStart = getGroupTimestamp(start, granularity);
    actualEnd = getGroupTimestamp(end, granularity);
  } else if (start !== 0) {
    // 如果只指定了开始时间，结束时间使用最后一条记录
    actualStart = getGroupTimestamp(start, granularity);
    actualEnd = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].timestamp : actualStart;
  } else if (end !== 0) {
    // 如果只指定了结束时间，开始时间使用第一条记录
    actualStart = sortedRecords.length > 0 ? sortedRecords[0].timestamp : getGroupTimestamp(end, granularity);
    actualEnd = getGroupTimestamp(end, granularity);
  } else {
    // 如果都没指定，使用记录的时间范围进行插值
    if (sortedRecords.length === 0) return [];
    actualStart = sortedRecords[0].timestamp;
    actualEnd = sortedRecords[sortedRecords.length - 1].timestamp;
  }
  
  // 构建时间戳到记录的映射
  const recordMap = new Map<number, BalanceRecord>();
  for (const record of sortedRecords) {
    recordMap.set(record.timestamp, record);
  }
  
  // 生成完整的时间序列
  const result: BalanceRecord[] = [];
  let currentTimestamp = actualStart;
  let lastBalance = 0;
  let defaultRecord: Partial<BalanceRecord> = {};
  
  // 如果有记录，使用第一条记录作为默认模板
  if (sortedRecords.length > 0) {
    const firstRecord = sortedRecords[0];
    defaultRecord = {
      username: firstRecord.username,
      type: firstRecord.type,
    };
    // 如果开始时间早于第一条记录，使用第一条记录的余额作为初始值
    lastBalance = firstRecord.balance;
  }
  
  while (currentTimestamp <= actualEnd) {
    if (recordMap.has(currentTimestamp)) {
      // 如果存在该时间点的记录，使用实际记录
      const actualRecord = recordMap.get(currentTimestamp)!;
      result.push(actualRecord);
      lastBalance = actualRecord.balance;
      // 更新默认记录模板
      defaultRecord.username = actualRecord.username;
      defaultRecord.type = actualRecord.type;
    } else {
      // 如果不存在该时间点的记录，生成插值记录
      result.push({
        username: defaultRecord.username || 'unknown',
        timestamp: currentTimestamp,
        balance: lastBalance,
        type: defaultRecord.type || 'interpolated',
        delta: 0,
      });
    }
    
    currentTimestamp = getNextTimestamp(currentTimestamp, granularity);
  }
  
  // 按时间戳降序排序返回（最新的在前）
  return result.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================================
// 数据查询操作函数
// ============================================================================

/**
 * 获取指定用户的所有余额记录
 * @param {string} username - 用户名
 * @returns {Promise<BalanceRecord[]>} 按时间倒序排列的所有余额记录
 */
async function getAllBalanceRecords(username: string): Promise<BalanceRecord[]> {
  // 获取用户的分片列表
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });

  // 从所有分片中收集记录
  const records: BalanceRecord[] = [];
  for (const key of shardings) {
    const storageRecords = await storage.getItem<BalanceRecord[]>(key);
    records.push(...(storageRecords ?? []));
  }

  // 按时间戳降序排序返回
  return records.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 根据时间范围查询指定用户的余额记录
 * 使用分片策略优化查询性能，只加载相关的时间段数据
 * 
 * @param {string} username - 用户名
 * @param {number} start - 开始时间戳（包含）
 * @param {number} end - 结束时间戳（包含）
 * @returns {Promise<BalanceRecord[]>} 按时间倒序排列的余额记录数组
 */
async function queryBalanceRecords(username: string, start: number, end: number): Promise<BalanceRecord[]> {
  // 获取用户的分片列表
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });

  // 将查询时间范围转换为年月
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  // 筛选在时间范围内的分片
  const relevantShardings = shardings.filter(shardingKey => {
    // 从分片键中解析年月信息
    // 分片键格式：local:balanceRecords:用户名|年|月
    const parts = shardingKey.split('|');
    if (parts.length < 3) return false;

    const shardYear = parseInt(parts[parts.length - 2], 10);
    const shardMonth = parseInt(parts[parts.length - 1], 10);

    // 比较分片的年月是否在查询的年月范围内
    if (shardYear < startYear || shardYear > endYear) {
      return false;
    }

    // 如果只跨一年，需要检查月份范围
    if (startYear === endYear) {
      return shardMonth >= startMonth && shardMonth <= endMonth;
    }

    // 如果跨多年，分情况处理
    if (shardYear === startYear) {
      return shardMonth >= startMonth;
    } else if (shardYear === endYear) {
      return shardMonth <= endMonth;
    } else {
      return true; // 中间年份的所有月份都包含
    }
  });

  // 从相关分片中获取所有记录
  const records: BalanceRecord[] = [];
  for (const shardingKey of relevantShardings) {
    const shardRecords = await storage.getItem<BalanceRecord[]>(shardingKey);
    if (shardRecords) {
      records.push(...shardRecords);
    }
  }

  // 过滤记录，只返回在指定时间范围内的记录（左闭右闭区间）
  // 并按时间戳降序排序（最新的在前）
  return records
    .filter(record => record.timestamp >= start && record.timestamp <= end)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 获取指定用户的最新余额记录
 * @param {string} username - 用户名
 * @returns {Promise<BalanceRecord | null>} 最新的余额记录，如果不存在则返回 null
 */
async function getLatestBalanceRecord(username: string): Promise<BalanceRecord | null> {
  // 构建分片列表的存储键
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;

  // 获取所有分片键列表
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });
  if (shardings.length === 0) return null;

  // 按字符串降序排序，确保最新的分片在前面
  shardings.sort((a, b) => b.localeCompare(a));

  // 遍历分片，查找最新记录
  for (const shardingKey of shardings) {
    const records = await storage.getItem<BalanceRecord[]>(shardingKey);

    // 如果找到记录且不为空，返回第一条（最新的）
    if (records && records.length > 0) {
      return records[0];
    }
  }

  // 所有分片都没有记录
  return null;
}

/**
 * 聚合函数，根据时间戳将指定粒度的数据聚合为一条记录
 * 
 * @param records - 待聚合的余额记录数组
 * @param granularity - 聚合粒度：'minute' | 'hour' | 'day' | 'month' | 'year'
 * @param fillGaps - 是否填充时间序列中的空缺，默认为 false
 * @returns 聚合后的余额记录数组，按时间戳降序排列
 * 
 * 聚合策略：
 * - timestamp: 使用该时间段的标准化开始时间
 * - balance: 取该时间段内最新记录的余额
 * - type: 取该时间段内最新记录的类型
 * - delta: 累加该时间段内所有记录的 delta 值
 * - username: 取该时间段内最新记录的用户名
 * 
 * 如果启用 fillGaps，将生成完整的时间序列：
 * - 缺失时间点的 balance 使用前一个记录的 balance
 * - 缺失时间点的 delta 为 0
 */
function aggregateBalanceRecords(
  records: BalanceRecord[],
  granularity: 'minute' | 'hour' | 'day' | 'month' | 'year',
): BalanceRecord[] {
  // 边界情况：空数组直接返回
  if (records.length === 0) return [];

  // 第一步：按标准化时间戳将记录分组
  const groups = new Map<number, BalanceRecord[]>();
  for (const record of records) {
    const groupTimestamp = getGroupTimestamp(record.timestamp, granularity);
    const group = groups.get(groupTimestamp) ?? [];
    group.push(record);
    groups.set(groupTimestamp, group);
  }

  // 第二步：从每个组生成聚合记录
  const aggregated: BalanceRecord[] = [];
  for (const [groupTimestamp, group] of groups.entries()) {
    // 按时间戳降序排序，获取该组内最新的记录
    const latest = group.sort((a, b) => b.timestamp - a.timestamp)[0];
    // 构建聚合记录
    aggregated.push({
      username: latest.username,           // 最新记录的用户名
      timestamp: groupTimestamp,           // 标准化的时间段开始时间
      balance: latest.balance,             // 最新记录的余额
      type: latest.type,                   // 最新记录的类型
      delta: group.reduce((sum, record) => sum + record.delta, 0), // 累加所有 delta
    });
  }

  return aggregated.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================================
// 导出函数
// ============================================================================

export { appendBalanceRecords, getAllBalanceRecords, getLatestBalanceRecord, queryBalanceRecords, aggregateBalanceRecords, fillTimeSeriesGaps };