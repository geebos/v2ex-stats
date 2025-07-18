import type { BalanceRecord, Granularity, RecordType } from "@/types/types";
import { storage } from "@wxt-dev/storage";

// ==================== 键值生成工具 ====================
// 生成分片键：基于年月进行数据分片
const getShardingKey = (record: BalanceRecord): string => {
  const date = new Date(record.timestamp);
  return `${date.getUTCFullYear()}|${date.getUTCMonth().toString().padStart(2, '0')}`;
};

// 生成存储键：用户名+分片键
const getStorageKey = (record: BalanceRecord): string => 
  `${record.username}|${getShardingKey(record)}`;

// 生成唯一键：用于数据去重
const getUniqueKey = (record: BalanceRecord): string => 
  `${record.timestamp}|${record.balance}|${record.username}`;

// ==================== 数据处理工具 ====================
// 对余额记录去重并按时间倒序排序
const getUniqueBalanceRecords = (records: BalanceRecord[]): BalanceRecord[] => {
  const uniqueMap = new Map<string, BalanceRecord>();
  records.forEach(record => uniqueMap.set(getUniqueKey(record), record));
  return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
};

// ==================== 时间处理工具 ====================
// 根据粒度标准化时间戳到时间段开始
const getGroupTimestamp = (timestamp: number, granularity: Granularity): number => {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  switch (granularity) {
    case 'minute': return new Date(Date.UTC(year, month, day, hour, minute, 0, 0)).getTime();
    case 'hour': return new Date(Date.UTC(year, month, day, hour, 0, 0, 0)).getTime();
    case 'day': return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).getTime();
    case 'month': return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).getTime();
    case 'year': return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).getTime();
  }
};

// 计算下一个时间段的时间戳
const getNextTimestamp = (timestamp: number, granularity: Granularity): number => {
  const date = new Date(timestamp);
  
  switch (granularity) {
    case 'minute': return timestamp + 60 * 1000;
    case 'hour': return timestamp + 60 * 60 * 1000;
    case 'day': return timestamp + 24 * 60 * 60 * 1000;
    case 'month': return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0)).getTime();
    case 'year': return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0)).getTime();
    default: return timestamp;
  }
};

// ==================== 数据存储操作 ====================
// 追加余额记录到本地存储，使用分片策略
const appendBalanceRecords = async (records: BalanceRecord[]): Promise<void> => {
  if (records.length === 0) return;

  // 按存储键分组记录
  const storageMap = new Map<string, BalanceRecord[]>();
  records.forEach(record => {
    const key = getStorageKey(record);
    const existingRecords = storageMap.get(key) ?? [];
    existingRecords.push(record);
    storageMap.set(key, existingRecords);
  });

  // 更新每个分片的数据
  for (const [key, newRecords] of storageMap) {
    const storageRecords = await storage.getItem<BalanceRecord[]>(`local:balanceRecords:${key}`);
    const uniqueRecords = getUniqueBalanceRecords([...(storageRecords ?? []), ...newRecords]);
    await storage.setItem(`local:balanceRecords:${key}`, uniqueRecords);
  }

  // 更新用户的分片列表
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${records[0].username}`;
  let shardings = await storage.getItem<string[]>(shardingListKey, { fallback: [] });
  shardings.push(...Array.from(storageMap.keys()).map(key => `local:balanceRecords:${key}`));
  shardings = [...new Set(shardings)];
  
  await storage.setItem(shardingListKey, shardings);
};

// ==================== 数据查询操作 ====================
// 获取指定用户的所有余额记录
const getAllBalanceRecords = async (username: string): Promise<BalanceRecord[]> => {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });

  const records: BalanceRecord[] = [];
  for (const key of shardings) {
    const storageRecords = await storage.getItem<BalanceRecord[]>(key);
    if (storageRecords) records.push(...storageRecords);
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
};

// 根据时间范围查询余额记录，使用分片优化性能
const queryBalanceRecords = async (username: string, recordType: RecordType, start: number, end: number): Promise<BalanceRecord[]> => {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });

  // 计算查询时间范围的年月
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  // 筛选相关的分片
  const relevantShardings = shardings.filter(shardingKey => {
    const parts = shardingKey.split('|');
    if (parts.length < 3) return false;

    const shardYear = parseInt(parts[parts.length - 2], 10);
    const shardMonth = parseInt(parts[parts.length - 1], 10);

    if (shardYear < startYear || shardYear > endYear) return false;
    if (startYear === endYear) return shardMonth >= startMonth && shardMonth <= endMonth;
    if (shardYear === startYear) return shardMonth >= startMonth;
    if (shardYear === endYear) return shardMonth <= endMonth;
    return true;
  });

  // 从相关分片获取记录
  const records: BalanceRecord[] = [];
  for (const shardingKey of relevantShardings) {
    const shardRecords = await storage.getItem<BalanceRecord[]>(shardingKey);
    if (shardRecords) records.push(...shardRecords);
  }

  return records
    .filter(record => record.timestamp >= start && record.timestamp <= end)
    .filter(record => recordType === 'all' || (recordType === 'income' && record.delta > 0) || (recordType === 'expense' && record.delta < 0))
    .sort((a, b) => b.timestamp - a.timestamp);
};

// 获取指定用户的最新余额记录
const getLatestBalanceRecord = async (username: string): Promise<BalanceRecord | null> => {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });
  
  if (shardings.length === 0) return null;

  // 按字符串降序排序，最新分片在前
  shardings.sort((a, b) => b.localeCompare(a));

  for (const shardingKey of shardings) {
    const records = await storage.getItem<BalanceRecord[]>(shardingKey);
    if (records && records.length > 0) return records[0];
  }

  return null;
};

// ==================== 数据聚合操作 ====================
// 按时间粒度聚合记录：同一时间段内的记录合并为一条
const aggregateBalanceRecordsByTime = (records: BalanceRecord[], granularity: Granularity): BalanceRecord[] => {
  if (records.length === 0) return [];

  // 按标准化时间戳分组
  const groups = new Map<number, BalanceRecord[]>();
  records.forEach(record => {
    const groupTimestamp = getGroupTimestamp(record.timestamp, granularity);
    const group = groups.get(groupTimestamp) ?? [];
    group.push(record);
    groups.set(groupTimestamp, group);
  });

  // 生成聚合记录：使用最新记录的余额，累加delta
  const aggregated: BalanceRecord[] = [];
  for (const [groupTimestamp, group] of groups.entries()) {
    const latest = group.sort((a, b) => b.timestamp - a.timestamp)[0];
    aggregated.push({
      username: latest.username,
      timestamp: groupTimestamp,
      balance: latest.balance,
      type: latest.type,
      delta: group.reduce((sum, record) => sum + record.delta, 0),
    });
  }

  return aggregated.sort((a, b) => b.timestamp - a.timestamp);
};

// 按操作类型聚合记录：相同类型的记录合并为统计数据
const aggregateBalanceRecordsByType = (records: BalanceRecord[]): BalanceRecord[] => {
  if (records.length === 0) return [];

  // 按操作类型分组
  const groups = new Map<string, BalanceRecord[]>();
  records.forEach(record => {
    const group = groups.get(record.type) ?? [];
    group.push(record);
    groups.set(record.type, group);
  });

  // 生成统计记录：累加同类型的delta值
  const aggregated: BalanceRecord[] = [];
  for (const [groupType, group] of groups.entries()) {
    aggregated.push({
      username: group[0].username,
      timestamp: 0,
      balance: 0,
      type: groupType,
      delta: group.reduce((sum, record) => sum + record.delta, 0),
    });
  }

  return aggregated;
};

// 填充时间序列中的空缺，生成完整的时间序列
const fillTimeSeriesGaps = (
  aggregatedRecords: BalanceRecord[],
  granularity: Granularity,
  start: number,
  end: number
): BalanceRecord[] => {
  if (aggregatedRecords.length === 0 && start === 0 && end === 0) return [];

  const sortedRecords = aggregatedRecords.sort((a, b) => a.timestamp - b.timestamp);

  // 确定实际的时间范围
  let actualStart: number, actualEnd: number;
  if (start !== 0 && end !== 0) {
    actualStart = getGroupTimestamp(start, granularity);
    actualEnd = getGroupTimestamp(end, granularity);
  } else if (start !== 0) {
    actualStart = getGroupTimestamp(start, granularity);
    actualEnd = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].timestamp : actualStart;
  } else if (end !== 0) {
    actualStart = sortedRecords.length > 0 ? sortedRecords[0].timestamp : getGroupTimestamp(end, granularity);
    actualEnd = getGroupTimestamp(end, granularity);
  } else {
    if (sortedRecords.length === 0) return [];
    actualStart = sortedRecords[0].timestamp;
    actualEnd = sortedRecords[sortedRecords.length - 1].timestamp;
  }

  // 构建时间戳到记录的映射
  const recordMap = new Map<number, BalanceRecord>();
  sortedRecords.forEach(record => recordMap.set(record.timestamp, record));

  // 生成完整的时间序列
  const result: BalanceRecord[] = [];
  let currentTimestamp = actualStart;
  let lastBalance = 0;
  let defaultRecord: Partial<BalanceRecord> = {};

  if (sortedRecords.length > 0) {
    const firstRecord = sortedRecords[0];
    defaultRecord = { username: firstRecord.username, type: firstRecord.type };
    lastBalance = firstRecord.balance;
  }

  while (currentTimestamp <= actualEnd) {
    if (recordMap.has(currentTimestamp)) {
      // 使用实际记录
      const actualRecord = recordMap.get(currentTimestamp)!;
      result.push(actualRecord);
      lastBalance = actualRecord.balance;
      defaultRecord.username = actualRecord.username;
      defaultRecord.type = actualRecord.type;
    } else {
      // 生成插值记录
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

  return result.sort((a, b) => b.timestamp - a.timestamp);
};

// ==================== 导出 ====================
export { 
  appendBalanceRecords, 
  getAllBalanceRecords, 
  getLatestBalanceRecord, 
  queryBalanceRecords, 
  aggregateBalanceRecordsByTime, 
  fillTimeSeriesGaps,
  aggregateBalanceRecordsByType
};