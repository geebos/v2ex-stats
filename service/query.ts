import type { BalanceRecord } from "@/types/types";
import { storage } from "@wxt-dev/storage";

function getShardingKey(record: BalanceRecord) {
  const date = new Date(record.timestamp);
  return `${date.getUTCFullYear()}|${date.getUTCMonth()}`;
}

function getStorageKey(record: BalanceRecord) {
  return `${record.username}|${getShardingKey(record)}`;
}

function getUniqueKey(record: BalanceRecord) {
  return `${record.timestamp}|${record.balance}|${record.username}`;
}

function getUniqueBalanceRecords(records: BalanceRecord[]) {
  const uniqueMap = new Map<string, BalanceRecord>();
  for (const record of records) {
    uniqueMap.set(getUniqueKey(record), record);
  }
  return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

async function appendBalanceRecords(records: BalanceRecord[]) {
  if (records.length === 0) return;

  const storageMap = new Map<string, BalanceRecord[]>();
  for (const record of records) {
    const key = getStorageKey(record);
    const records = storageMap.get(key) ?? [];
    records.push(record);
    storageMap.set(key, records);
  }

  for (const [key, records] of storageMap) {
    const storageRecords = await storage.getItem<BalanceRecord[]>(`local:balanceRecords:${key}`);
    const uniqueRecords = getUniqueBalanceRecords([...(storageRecords ?? []), ...records]);
    await storage.setItem(`local:balanceRecords:${key}`, uniqueRecords);
  }
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${records[0].username}`;
  let shardings = await storage.getItem<string[]>(shardingListKey, { fallback: [] });
  shardings.push(...Array.from(storageMap.keys()).map(key => `local:balanceRecords:${key}`));
  shardings = Array.from(new Set(shardings));
  console.log('shardings', shardings);
  await storage.setItem(shardingListKey, shardings);
}

async function getAllBalanceRecords(username: string) {
  const shardingListKey: StorageItemKey = `local:balanceRecordShardings:${username}`;
  const shardings = await storage.getItem<StorageItemKey[]>(shardingListKey, { fallback: [] });
  const records: BalanceRecord[] = [];
  for (const key of shardings) {
    const storageRecords = await storage.getItem<BalanceRecord[]>(key);
    records.push(...(storageRecords ?? []));
  }
  return records.sort((a, b) => b.timestamp - a.timestamp);
}

export { appendBalanceRecords, getAllBalanceRecords };