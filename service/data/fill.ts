import { Granularity } from "@/types/types";
import { getGroupTimestamp, getNextTimestamp } from "./common";
import { TimeSeriesRecord } from "./types";

// 填充时间序列空缺，生成完整的时间序列数据
const fillGaps = <T extends TimeSeriesRecord>(
  records: T[],
  granularity: Granularity,
  start: number,
  end: number,
  generator: (timestamp: number, leftRecord: T) => T
): T[] => {
  if (records.length === 0 || (start === 0 && end === 0)) return records;

  const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);

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
  const recordMap = new Map<number, T>();
  sortedRecords.forEach(record => recordMap.set(record.timestamp, record));

  // 生成完整的时间序列
  const result: T[] = [];
  let currentTimestamp = actualStart;

  // 如果存在记录，则使用第一个记录的值作为左值
  let leftRecord = sortedRecords[0];

  while (currentTimestamp <= actualEnd) {
    if (recordMap.has(currentTimestamp)) {
      // 使用实际记录
      const actualRecord = recordMap.get(currentTimestamp)!;
      result.push(actualRecord);
      leftRecord = actualRecord;
    } else {
      // 生成插值记录
      result.push(generator(currentTimestamp, leftRecord));
    }

    currentTimestamp = getNextTimestamp(currentTimestamp, granularity);
  }

  return result;
};

export { fillGaps };