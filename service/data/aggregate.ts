import { Granularity } from "@/types/types";
import { getGroupTimestamp } from "./common";
import { TimeSeriesRecord } from "./types";

// 按时间粒度聚合记录：同一时间段内的记录合并
const aggreateByTime = <T extends TimeSeriesRecord>(records: T[], granularity: Granularity, aggregator: (timestamp: number, group: T[]) => T): T[] => {
  return aggregateByKey(records, (record) => getGroupTimestamp(record.timestamp, granularity), aggregator);
};

// 按指定键值聚合记录：相同键值的记录合并处理
const aggregateByKey = <T, K, R>(records: T[], key: (record: T) => K, aggregator: (key: K, group: T[]) => R): R[] => {
  if (records.length === 0) return [];

  // 按键值分组记录
  const groups = new Map<K, T[]>();
  records.forEach(record => {
    const group = groups.get(key(record)) ?? [];
    group.push(record);
    groups.set(key(record), group);
  });

  // 生成聚合结果：对每组记录执行聚合操作
  const aggregated: R[] = [];
  for (const [groupType, group] of groups.entries()) {
    aggregated.push(aggregator(groupType, group));
  }

  return aggregated;
};

export { aggreateByTime, aggregateByKey };