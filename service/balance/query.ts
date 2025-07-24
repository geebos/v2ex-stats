import type { BalanceRecord, BalanceRecordType, CompactBalanceRecord, Granularity, RecordType } from "@/types/types";
import { storage } from "@wxt-dev/storage";
import { aggreateByTime, aggregateByKey } from "../data/aggregate";
import { fillGaps } from "../data/fill";

// ==================== 常量定义 ====================
// 预定义的余额记录类型，避免频繁查询存储
const defaultBalanceRecordTypes: BalanceRecordType[] = [
  { id: 10, value: "每日活跃度奖励" },
  { id: 11, value: "每日登录奖励" },
  { id: 12, value: "主题回复收益" },
  { id: 13, value: "创建回复" },
  { id: 14, value: "连续登录奖励" },
  { id: 15, value: "创建主题" },
  { id: 16, value: "发送谢意" },
  { id: 17, value: "创建主题附言" },
  { id: 18, value: "编辑主题" },
  { id: 19, value: "收到谢意" }
];

// 类型ID到值的映射缓存
const balanceTypeId2ValueMap = new Map<number, string>(defaultBalanceRecordTypes.map(type => [type.id, type.value]));

// 类型值到ID的映射缓存
const balanceTypeValue2IdMap = new Map<string, number>(defaultBalanceRecordTypes.map(type => [type.value, type.id]));

const descSort = (a: number, b: number) => b - a;

// ==================== 键值生成工具 ====================
// 根据时间戳生成分片键：年|月格式
const getShardingKey = (record: BalanceRecord): string => {
  const date = new Date(record.timestamp);
  return `${date.getUTCFullYear()}|${date.getUTCMonth().toString().padStart(2, '0')}`;
};

// 生成基础存储键：用户名|年|月
const getStorageKey = (record: BalanceRecord): string =>
  `${record.username}|${getShardingKey(record)}`;

// 生成记录唯一标识：用于去重
const getUniqueKey = (record: BalanceRecord): string =>
  `${record.timestamp}|${record.balance}|${record.username}`;

// ==================== 类型映射管理 ====================
// 根据类型ID获取类型值
const getBalanceRecordTypeValue = async (id: number): Promise<string> => {
  if (balanceTypeId2ValueMap.has(id)) return balanceTypeId2ValueMap.get(id)!;
  const recordTypes = await storage.getItem<BalanceRecordType[]>(`local:balanceRecordTypes`);
  const recordType = recordTypes?.find(type => type.id === id);
  return recordType?.value || 'UNKNOWN';
};

// 根据类型值获取类型ID，不存在时自动创建
const getBalanceRecordTypeID = async (value: string): Promise<number> => {
  if (balanceTypeValue2IdMap.has(value)) return balanceTypeValue2IdMap.get(value)!;
  const recordTypes = await storage.getItem<BalanceRecordType[]>(`local:balanceRecordTypes`);
  const recordType = recordTypes?.find(type => type.value === value);
  if (!recordType) {
    const newRecordType: BalanceRecordType = {
      id: recordTypes?.length || 0,
      value,
    };
    await storage.setItem(`local:balanceRecordTypes`, [...(recordTypes ?? []), newRecordType]);
    return newRecordType.id;
  }
  return recordType.id;
};

// ==================== 数据序列化/反序列化 ====================
// 从存储中读取压缩数据并转换为BalanceRecord对象
const getBalanceRecords = async (username: string, keys: StorageItemKey[]): Promise<BalanceRecord[]> => {
  const result: BalanceRecord[] = [];
  for (const key of keys) {
    const records = await storage.getItem<CompactBalanceRecord[]>(key);
    if (!records) continue;
    for (const record of records) {
      result.push({
        timestamp: record[0],
        type: await getBalanceRecordTypeValue(record[1]),
        delta: record[2],
        balance: record[3],
        username,
      });
    }
  }
  console.log('getBalanceRecords', username, keys, result);
  return result.sort((a, b) => descSort(a.timestamp, b.timestamp));
};

// 将BalanceRecord对象压缩后存储
const setBalanceRecords = async (key: StorageItemKey, records: BalanceRecord[]): Promise<void> => {
  records = records.sort((a, b) => descSort(a.timestamp, b.timestamp));
  const compactRecords: CompactBalanceRecord[] = [];
  for (const record of records) {
    compactRecords.push([record.timestamp, await getBalanceRecordTypeID(record.type), record.delta, record.balance]);
  }
  console.log('setBalanceRecords', key, records, compactRecords);
  await storage.setItem(key, compactRecords);
};

// ==================== 数据处理工具 ====================
// 对记录去重并按时间倒序排序
const getUniqueBalanceRecords = (records: BalanceRecord[]): BalanceRecord[] => {
  const uniqueMap = new Map<string, BalanceRecord>();
  records.forEach(record => uniqueMap.set(getUniqueKey(record), record));
  return Array.from(uniqueMap.values()).sort((a, b) => descSort(a.timestamp, b.timestamp));
};

// ==================== 数据存储操作 ====================
// 追加新记录到存储中，使用分片策略
const appendBalanceRecords = async (records: BalanceRecord[]): Promise<void> => {
  if (records.length === 0) return;
  console.log('appendBalanceRecords start', records);

  // 按存储键分组记录
  const storageMap = new Map<string, BalanceRecord[]>();
  records.forEach(record => {
    const key = `local:balanceRecords:${getStorageKey(record)}`;
    const existingRecords = storageMap.get(key) ?? [];
    existingRecords.push(record);
    storageMap.set(key, existingRecords);
  });

  // 更新每个分片的数据
  for (const [key, newRecords] of storageMap) {
    console.log('appendBalanceRecords sharding', key, newRecords);
    const storageRecords = await getBalanceRecords(records[0].username, [key as StorageItemKey]);
    const uniqueRecords = getUniqueBalanceRecords([...(storageRecords ?? []), ...newRecords]);
    await setBalanceRecords(key as StorageItemKey, uniqueRecords);
  }

  // 更新用户的分片索引列表
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${records[0].username}`;
  let shardings = await storage.getItem<string[]>(shardingListKey, { fallback: [] });
  shardings.push(...Array.from(storageMap.keys()));
  shardings = [...new Set(shardings)];

  await storage.setItem(shardingListKey, shardings);
};

// ==================== 数据查询操作 ====================
// 获取指定用户的所有余额记录
const getAllBalanceRecords = async (username: string): Promise<BalanceRecord[]> => {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });
  return await getBalanceRecords(username, shardings);
};

// 根据时间范围和记录类型查询余额记录
const queryBalanceRecords = async (username: string, recordType: RecordType, start: number, end: number): Promise<BalanceRecord[]> => {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });

  // 计算查询时间范围涉及的年月
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  // 筛选相关的分片：只查询时间范围内的分片
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
  console.log('queryBalanceRecords relevantShardings', relevantShardings);

  // 从相关分片获取记录并过滤
  const records = await getBalanceRecords(username, relevantShardings);
  return records
    .filter(record => record.timestamp >= start && record.timestamp <= end)
    .filter(record => recordType === 'all' || (recordType === 'income' && record.delta > 0) || (recordType === 'expense' && record.delta < 0));
};

// 获取指定用户的最新余额记录
const getLatestBalanceRecord = async (username: string): Promise<BalanceRecord | null> => {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });

  if (shardings.length === 0) return null;

  // 按时间降序排序，最新分片在前
  shardings.sort((a, b) => b.localeCompare(a));

  for (const shardingKey of shardings) {
    const records = await getBalanceRecords(username, [shardingKey]);
    if (records && records.length > 0) return records[0];
  }

  return null;
};

// ==================== 数据聚合操作 ====================
// 按时间粒度聚合记录：同一时间段内的记录合并
const aggregateBalanceRecordsByTime = (records: BalanceRecord[], granularity: Granularity): BalanceRecord[] => {
  const aggregated = aggreateByTime(records, granularity, (timestamp, group) => {
    const latest = group.sort((a, b) => b.timestamp - a.timestamp)[0];
    return {
      username: latest.username,
      timestamp,
      balance: latest.balance,
      type: latest.type,
      delta: group.reduce((sum, record) => sum + record.delta, 0),
    };
  });

  return aggregated.sort((a, b) => descSort(a.timestamp, b.timestamp));
};

// 按操作类型聚合记录：相同类型的记录合并为统计数据
const aggregateBalanceRecordsByType = (records: BalanceRecord[]): BalanceRecord[] => {
  return aggregateByKey(records, record => record.type, (type, group) => {
    return {
      username: group[0].username,
      timestamp: 0,
      balance: 0,
      type,
      delta: group.reduce((sum, record) => sum + record.delta, 0),
    };
  });
};

// 填充时间序列空缺，生成完整的时间序列数据
const fillTimeSeriesGaps = (
  aggregatedRecords: BalanceRecord[],
  granularity: Granularity,
  start: number,
  end: number
): BalanceRecord[] => {
  const result = fillGaps(aggregatedRecords, granularity, start, end, (currentTimestamp, leftRecord) => {
    return {
      username: leftRecord.username,
      timestamp: currentTimestamp,
      balance: leftRecord.balance,
      type: leftRecord.type,
      delta: 0,
    };
  });

  return result.sort((a, b) => descSort(a.timestamp, b.timestamp));
};

// 对齐多个时间序列的时间点，缺失时间点补充默认记录
const alignBanlanceRecordsTimeSeries = (series: BalanceRecord[][]): BalanceRecord[][] => {
  if (series.length === 0 || series.length === 1) return series;

  // 对每个序列按时间戳降序排序
  const sortedSeries = series.map(serie =>
    [...serie].sort((a, b) => descSort(a.timestamp, b.timestamp))
  );

  // 收集所有不同的时间戳
  const allTimestamps = new Set<number>();
  sortedSeries.forEach(serie => {
    serie.forEach(record => allTimestamps.add(record.timestamp));
  });

  // 时间戳降序排列
  const sortedTimestamps = Array.from(allTimestamps).sort(descSort);

  // 初始化结果数组和游标数组
  const alignedSeries: BalanceRecord[][] = sortedSeries.map(() => []);
  const cursors = new Array(sortedSeries.length).fill(0);

  // 使用第一个序列的用户名作为默认值
  const username = sortedSeries[0][0].username ?? 'unknown';

  // 遍历所有时间戳，为每个序列填充记录
  sortedTimestamps.forEach(timestamp => {
    sortedSeries.forEach((serie, seriesIndex) => {
      const cursor = cursors[seriesIndex];

      if (cursor < serie.length && serie[cursor].timestamp === timestamp) {
        // 时间戳匹配，使用原记录并推进游标
        alignedSeries[seriesIndex].push(serie[cursor]);
        cursors[seriesIndex]++;
      } else {
        // 时间戳不匹配，插入默认记录
        alignedSeries[seriesIndex].push({ username, timestamp, balance: 0, delta: 0, type: '' });
      }
    });
  });

  return alignedSeries;
};

// ==================== 导出 ====================
export {
  appendBalanceRecords,
  getAllBalanceRecords,
  getLatestBalanceRecord,
  queryBalanceRecords,
  aggregateBalanceRecordsByTime,
  fillTimeSeriesGaps,
  aggregateBalanceRecordsByType,
  alignBanlanceRecordsTimeSeries,
  // 为测试导出的内部函数
  getBalanceRecords,
  setBalanceRecords
};