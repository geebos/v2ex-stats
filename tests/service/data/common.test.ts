import { describe, it, expect } from 'vitest';
import { getGroupTimestamp, getNextTimestamp } from '../../../service/data/common';
import { Granularity } from '@/types/types';

describe('getGroupTimestamp', () => {
  it('应该正确处理分钟粒度的时间戳', () => {
    // 2024-01-01T10:30:45.123Z 应该标准化为 2024-01-01T10:30:00.000Z
    const input = new Date('2024-01-01T10:30:45.123Z').getTime();
    const expected = new Date('2024-01-01T10:30:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理小时粒度的时间戳', () => {
    // 2024-01-01T10:30:45.123Z 应该标准化为 2024-01-01T10:00:00.000Z
    const input = new Date('2024-01-01T10:30:45.123Z').getTime();
    const expected = new Date('2024-01-01T10:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确处理天粒度的时间戳', () => {
    // 2024-01-01T10:30:45.123Z 应该标准化为 2024-01-01T00:00:00.000Z
    const input = new Date('2024-01-01T10:30:45.123Z').getTime();
    const expected = new Date('2024-01-01T00:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'day')).toBe(expected);
  });

  it('应该正确处理月粒度的时间戳', () => {
    // 2024-01-15T10:30:45.123Z 应该标准化为 2024-01-01T00:00:00.000Z
    const input = new Date('2024-01-15T10:30:45.123Z').getTime();
    const expected = new Date('2024-01-01T00:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理年粒度的时间戳', () => {
    // 2024-06-15T10:30:45.123Z 应该标准化为 2024-01-01T00:00:00.000Z
    const input = new Date('2024-06-15T10:30:45.123Z').getTime();
    const expected = new Date('2024-01-01T00:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理边界时间 - 整点分钟', () => {
    const input = new Date('2024-01-01T10:30:00.000Z').getTime();
    const expected = new Date('2024-01-01T10:30:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理边界时间 - 整点小时', () => {
    const input = new Date('2024-01-01T10:00:00.000Z').getTime();
    const expected = new Date('2024-01-01T10:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确处理边界时间 - 月初', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2024-01-01T00:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理边界时间 - 年初', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2024-01-01T00:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理跨月边界情况', () => {
    // 2024-02-29T23:59:59.999Z (闰年最后一天) 应该标准化为 2024-02-01T00:00:00.000Z
    const input = new Date('2024-02-29T23:59:59.999Z').getTime();
    const expected = new Date('2024-02-01T00:00:00.000Z').getTime();
    
    expect(getGroupTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理时区相关的时间', () => {
    // 使用UTC时间确保测试结果一致
    const input = Date.UTC(2024, 0, 15, 14, 30, 45, 123); // 2024-01-15T14:30:45.123Z
    const expected = Date.UTC(2024, 0, 15, 14, 0, 0, 0); // 2024-01-15T14:00:00.000Z
    
    expect(getGroupTimestamp(input, 'hour')).toBe(expected);
  });
});

describe('getNextTimestamp', () => {
  it('应该正确计算下一分钟的时间戳', () => {
    const input = new Date('2024-01-01T10:30:00.000Z').getTime();
    const expected = new Date('2024-01-01T10:31:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确计算下一小时的时间戳', () => {
    const input = new Date('2024-01-01T10:00:00.000Z').getTime();
    const expected = new Date('2024-01-01T11:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确计算下一天的时间戳', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2024-01-02T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'day')).toBe(expected);
  });

  it('应该正确计算下一月的时间戳', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2024-02-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确计算下一年的时间戳', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2025-01-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理月底边界情况 - 1月到2月', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2024-02-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理月底边界情况 - 2月到3月（闰年）', () => {
    const input = new Date('2024-02-01T00:00:00.000Z').getTime(); // 2024是闰年
    const expected = new Date('2024-03-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理月底边界情况 - 2月到3月（平年）', () => {
    const input = new Date('2023-02-01T00:00:00.000Z').getTime(); // 2023是平年
    const expected = new Date('2023-03-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理12月到次年1月的边界情况', () => {
    const input = new Date('2024-12-01T00:00:00.000Z').getTime();
    const expected = new Date('2025-01-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'month')).toBe(expected);
  });

  it('应该正确处理跨年边界情况', () => {
    const input = new Date('2024-01-01T00:00:00.000Z').getTime();
    const expected = new Date('2025-01-01T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'year')).toBe(expected);
  });

  it('应该正确处理23:59分钟到00:00的边界情况', () => {
    const input = new Date('2024-01-01T23:59:00.000Z').getTime();
    const expected = new Date('2024-01-02T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'minute')).toBe(expected);
  });

  it('应该正确处理23小时到0小时的边界情况', () => {
    const input = new Date('2024-01-01T23:00:00.000Z').getTime();
    const expected = new Date('2024-01-02T00:00:00.000Z').getTime();
    
    expect(getNextTimestamp(input, 'hour')).toBe(expected);
  });

  it('应该正确处理不支持的粒度类型', () => {
    const input = new Date('2024-01-01T10:30:00.000Z').getTime();
    // @ts-ignore - 测试错误输入
    const result = getNextTimestamp(input, 'invalid' as Granularity);
    
    expect(result).toBe(input); // 默认返回原时间戳
  });

  it('应该正确处理UTC时间计算', () => {
    const input = Date.UTC(2024, 0, 1, 10, 30, 0, 0); // 2024-01-01T10:30:00.000Z
    const expected = Date.UTC(2024, 0, 1, 10, 31, 0, 0); // 2024-01-01T10:31:00.000Z
    
    expect(getNextTimestamp(input, 'minute')).toBe(expected);
  });
}); 