import { describe, it, expect } from 'vitest';
import { getGroupTimestamp, getNextTimestamp } from '@/service/data/common';
import { Granularity } from '@/types/types';

describe('getGroupTimestamp', () => {
  it('应该正确处理分钟粒度的时间戳', () => {
    // 本地时间 2024-01-01 10:30:45.123 应该标准化为 2024-01-01 10:30:00.000
    const input = new Date(2024, 0, 1, 10, 30, 45, 123).getTime();
    const expected = new Date(2024, 0, 1, 10, 30, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理小时粒度的时间戳', () => {
    // 本地时间 2024-01-01 10:30:45.123 应该标准化为 2024-01-01 10:00:00.000
    const input = new Date(2024, 0, 1, 10, 30, 45, 123).getTime();
    const expected = new Date(2024, 0, 1, 10, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确处理天粒度的时间戳', () => {
    // 本地时间 2024-01-01 10:30:45.123 应该标准化为 2024-01-01 00:00:00.000
    const input = new Date(2024, 0, 1, 10, 30, 45, 123).getTime();
    const expected = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'day')).toBe(expected);
  });

  it('应该正确处理月粒度的时间戳', () => {
    // 本地时间 2024-01-15 10:30:45.123 应该标准化为 2024-01-01 00:00:00.000
    const input = new Date(2024, 0, 15, 10, 30, 45, 123).getTime();
    const expected = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理年粒度的时间戳', () => {
    // 本地时间 2024-06-15 10:30:45.123 应该标准化为 2024-01-01 00:00:00.000
    const input = new Date(2024, 5, 15, 10, 30, 45, 123).getTime();
    const expected = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理边界时间 - 整点分钟', () => {
    const input = new Date(2024, 0, 1, 10, 30, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 10, 30, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理边界时间 - 整点小时', () => {
    const input = new Date(2024, 0, 1, 10, 0, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 10, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确处理边界时间 - 月初', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理边界时间 - 年初', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理跨月边界情况', () => {
    // 本地时间 2024-02-29 23:59:59.999 (闰年最后一天) 应该标准化为 2024-02-01 00:00:00.000
    const input = new Date(2024, 1, 29, 23, 59, 59, 999).getTime();
    const expected = new Date(2024, 1, 1, 0, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理本地时间', () => {
    // 使用本地时间进行测试
    const input = new Date(2024, 0, 15, 14, 30, 45, 123).getTime();
    const expected = new Date(2024, 0, 15, 14, 0, 0, 0).getTime();
    
    expect(getGroupTimestamp(input, 'hour')).toBe(expected);
  });
});

describe('getNextTimestamp', () => {
  it('应该正确计算下一分钟的时间戳', () => {
    const input = new Date(2024, 0, 1, 10, 30, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 10, 31, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确计算下一小时的时间戳', () => {
    const input = new Date(2024, 0, 1, 10, 0, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 11, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确计算下一天的时间戳', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2024, 0, 2, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'day')).toBe(expected);
  });

  it('应该正确计算下一月的时间戳', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2024, 1, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确计算下一年的时间戳', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2025, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理月底边界情况 - 1月到2月', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2024, 1, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理月底边界情况 - 2月到3月（闰年）', () => {
    const input = new Date(2024, 1, 1, 0, 0, 0, 0).getTime(); // 2024是闰年
    const expected = new Date(2024, 2, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理月底边界情况 - 2月到3月（平年）', () => {
    const input = new Date(2023, 1, 1, 0, 0, 0, 0).getTime(); // 2023是平年
    const expected = new Date(2023, 2, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理12月到次年1月的边界情况', () => {
    const input = new Date(2024, 11, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2025, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理跨年边界情况', () => {
    const input = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const expected = new Date(2025, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理23:59分钟到00:00的边界情况', () => {
    const input = new Date(2024, 0, 1, 23, 59, 0, 0).getTime();
    const expected = new Date(2024, 0, 2, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理23小时到0小时的边界情况', () => {
    const input = new Date(2024, 0, 1, 23, 0, 0, 0).getTime();
    const expected = new Date(2024, 0, 2, 0, 0, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确处理不支持的粒度类型', () => {
    const input = new Date(2024, 0, 1, 10, 30, 0, 0).getTime();
    // @ts-ignore - 测试错误输入
    const result = getNextTimestamp(input, 'invalid' as Granularity);
    
    expect(result).toBe(input); // 默认返回原时间戳
  });

  it('应该正确处理本地时间计算', () => {
    const input = new Date(2024, 0, 1, 10, 30, 0, 0).getTime();
    const expected = new Date(2024, 0, 1, 10, 31, 0, 0).getTime();
    
    expect(getNextTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理夏令时边界情况', () => {
    // 这个测试会根据本地时区的夏令时设置而有所不同
    const input = new Date(2024, 2, 10, 2, 30, 0, 0).getTime(); // 3月10日可能是夏令时开始
    const result = getNextTimestamp(input, 'hour');
    
    // 只验证结果是一个有效的时间戳
    expect(typeof result).toBe('number');
    expect(result > input).toBe(true);
  });

  it('应该正确处理本地时间的月末边界', () => {
    const input = new Date(2024, 0, 31, 23, 59, 0, 0).getTime(); // 1月31日 23:59
    const result = getNextTimestamp(input, 'minute');
    const expected = new Date(2024, 1, 1, 0, 0, 0, 0).getTime(); // 2月1日 00:00
    
    expect(result).toBe(expected);
  });

  it('应该正确处理本地时间的年末边界', () => {
    const input = new Date(2024, 11, 31, 23, 59, 0, 0).getTime(); // 12月31日 23:59
    const result = getNextTimestamp(input, 'minute');
    const expected = new Date(2025, 0, 1, 0, 0, 0, 0).getTime(); // 次年1月1日 00:00
    
    expect(result).toBe(expected);
  });
});

// 添加新的综合测试
describe('getGroupTimestamp 和 getNextTimestamp 综合测试', () => {
  it('应该正确处理分钟粒度的连续时间段', () => {
    const startTime = new Date(2024, 0, 1, 10, 30, 45, 123).getTime();
    
    // 获取分组时间戳
    const groupedTime = getGroupTimestamp(startTime, 'minute');
    expect(groupedTime).toBe(new Date(2024, 0, 1, 10, 30, 0, 0).getTime());
    
    // 获取下一个时间戳
    const nextTime = getNextTimestamp(groupedTime, 'minute');
    expect(nextTime).toBe(new Date(2024, 0, 1, 10, 31, 0, 0).getTime());
  });

  it('应该正确处理小时粒度的连续时间段', () => {
    const startTime = new Date(2024, 0, 1, 10, 30, 45, 123).getTime();
    
    const groupedTime = getGroupTimestamp(startTime, 'hour');
    expect(groupedTime).toBe(new Date(2024, 0, 1, 10, 0, 0, 0).getTime());
    
    const nextTime = getNextTimestamp(groupedTime, 'hour');
    expect(nextTime).toBe(new Date(2024, 0, 1, 11, 0, 0, 0).getTime());
  });

  it('应该正确处理天粒度的连续时间段', () => {
    const startTime = new Date(2024, 0, 1, 10, 30, 45, 123).getTime();
    
    const groupedTime = getGroupTimestamp(startTime, 'day');
    expect(groupedTime).toBe(new Date(2024, 0, 1, 0, 0, 0, 0).getTime());
    
    const nextTime = getNextTimestamp(groupedTime, 'day');
    expect(nextTime).toBe(new Date(2024, 0, 2, 0, 0, 0, 0).getTime());
  });

  it('应该正确处理月粒度的连续时间段', () => {
    const startTime = new Date(2024, 0, 15, 10, 30, 45, 123).getTime();
    
    const groupedTime = getGroupTimestamp(startTime, 'month');
    expect(groupedTime).toBe(new Date(2024, 0, 1, 0, 0, 0, 0).getTime());
    
    const nextTime = getNextTimestamp(groupedTime, 'month');
    expect(nextTime).toBe(new Date(2024, 1, 1, 0, 0, 0, 0).getTime());
  });

  it('应该正确处理年粒度的连续时间段', () => {
    const startTime = new Date(2024, 5, 15, 10, 30, 45, 123).getTime();
    
    const groupedTime = getGroupTimestamp(startTime, 'year');
    expect(groupedTime).toBe(new Date(2024, 0, 1, 0, 0, 0, 0).getTime());
    
    const nextTime = getNextTimestamp(groupedTime, 'year');
    expect(nextTime).toBe(new Date(2025, 0, 1, 0, 0, 0, 0).getTime());
  });

  it('应该确保所有粒度都使用本地时间', () => {
    const testTime = new Date(2024, 5, 15, 14, 30, 45, 123).getTime();
    const granularities: Granularity[] = ['minute', 'hour', 'day', 'month', 'year'];
    
    granularities.forEach(granularity => {
      const grouped = getGroupTimestamp(testTime, granularity);
      const next = getNextTimestamp(grouped, granularity);
      
      // 确保 next 时间戳大于 grouped 时间戳
      expect(next).toBeGreaterThan(grouped);
      
      // 确保结果都是有效的时间戳
      expect(typeof grouped).toBe('number');
      expect(typeof next).toBe('number');
      expect(isNaN(grouped)).toBe(false);
      expect(isNaN(next)).toBe(false);
    });
  });
}); 