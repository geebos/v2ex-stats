import { Granularity } from "@/types/types";
import { getGroupTimestamp } from "./common";
import { TimeSeriesRecord } from "./types";

// 按时间粒度聚合记录：同一时间段内的记录合并
const aggreateByTime = <T extends TimeSeriesRecord>(records: T[], granularity: Granularity, aggregator: (timestamp: number, group: T[]) => T): T[] => {
  if (records.length === 0) return [];

  // 按标准化时间戳分组
  const groups = new Map<number, T[]>();
  records.forEach(record => {
    const groupTimestamp = getGroupTimestamp(record.timestamp, granularity);
    const group = groups.get(groupTimestamp) ?? [];
    group.push(record);
    groups.set(groupTimestamp, group);
  });

  // 生成聚合记录：使用最新记录的余额，累加delta
  const aggregated: T[] = [];
  for (const [groupTimestamp, group] of groups.entries()) {
    aggregated.push(aggregator(groupTimestamp, group));
  }

  return aggregated;
};

const aggregateByKey = <T>(records: T[], key: (record: T) => string, aggregator: (key: string, group: T[]) => T): T[] => {
  if (records.length === 0) return [];

  // 按操作类型分组
  const groups = new Map<string, T[]>();
  records.forEach(record => {
    const group = groups.get(key(record)) ?? [];
    group.push(record);
    groups.set(key(record), group);
  });

  // 生成统计记录：累加同类型的delta值
  const aggregated: T[] = [];
  for (const [groupType, group] of groups.entries()) {
    aggregated.push(aggregator(groupType, group));
  }

  return aggregated;

};

export { aggreateByTime, aggregateByKey };