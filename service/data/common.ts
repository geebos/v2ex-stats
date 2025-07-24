import { Granularity } from "@/types/types";

// 根据粒度将时间戳标准化到时间段开始  
const getGroupTimestamp = (timestamp: number, granularity: Granularity): number => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  switch (granularity) {
    case 'minute': return new Date(year, month, day, hour, minute, 0, 0).getTime();
    case 'hour': return new Date(year, month, day, hour, 0, 0, 0).getTime();
    case 'day': return new Date(year, month, day, 0, 0, 0, 0).getTime();
    case 'month': return new Date(year, month, 1, 0, 0, 0, 0).getTime();
    case 'year': return new Date(year, 0, 1, 0, 0, 0, 0).getTime();
  }
};

// 计算下一个时间段的起始时间戳
const getNextTimestamp = (timestamp: number, granularity: Granularity): number => {
  const date = new Date(timestamp);

  switch (granularity) {
    case 'minute': return timestamp + 60 * 1000;
    case 'hour': return timestamp + 60 * 60 * 1000;
    case 'day': return timestamp + 24 * 60 * 60 * 1000;
    case 'month': return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
    case 'year': return new Date(date.getFullYear() + 1, 0, 1, 0, 0, 0, 0).getTime();
    default: return timestamp;
  }
};

export { getGroupTimestamp, getNextTimestamp };