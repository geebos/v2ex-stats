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
  return `${date.getUTCFullYear()}|${date.getUTCMonth()}`;
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

// ============================================================================
// 导出函数
// ============================================================================

export { appendBalanceRecords, getAllBalanceRecords };