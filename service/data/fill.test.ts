import { describe, it, expect } from 'vitest';
import { fillGaps } from './fill';
import { TimeSeriesRecord } from './types';
import { Granularity } from '@/types/types';

// 测试数据接口
interface TestRecord extends TimeSeriesRecord {
  value: number;
  type?: string;
}

describe('fillGaps', () => {
  // 测试生成器函数 - 使用左记录的值
  const copyLeftRecordGenerator = (timestamp: number, leftRecord: TestRecord): TestRecord => ({
    timestamp,
    value: leftRecord.value,
    type: 'generated',
  });

  // 测试生成器函数 - 使用固定值
  const fixedValueGenerator = (value: number) => (timestamp: number, leftRecord: TestRecord): TestRecord => ({
    timestamp,
    value,
    type: 'generated',
  });

  describe('边界情况处理', () => {
    it('应该正确处理空数组', () => {
      const result = fillGaps([], 'hour', 0, 0, copyLeftRecordGenerator);
      expect(result).toEqual([]);
    });

    it('应该在start和end都为0时返回原数组', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(), value: 20 },
      ];

      const result = fillGaps(records, 'hour', 0, 0, copyLeftRecordGenerator);
      expect(result).toEqual(records);
    });

    it('应该处理只有一条记录的情况', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
      ];

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T12:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 10:00, 11:00, 12:00
      expect(result[0]).toEqual({ timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 });
      expect(result[1]).toEqual({ 
        timestamp: new Date('2024-01-01T11:00:00.000Z').getTime(), 
        value: 10, 
        type: 'generated' 
      });
      expect(result[2]).toEqual({ 
        timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(), 
        value: 10, 
        type: 'generated' 
      });
    });
  });

  describe('时间范围参数组合', () => {
    const baseRecords: TestRecord[] = [
      { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
      { timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(), value: 20 },
    ];

    it('应该正确处理start!=0, end!=0的情况', () => {
      const start = new Date('2024-01-01T09:00:00.000Z').getTime();
      const end = new Date('2024-01-01T13:00:00.000Z').getTime();

      const result = fillGaps(baseRecords, 'hour', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(5); // 09:00, 10:00, 11:00, 12:00, 13:00
      expect(result[0].timestamp).toBe(new Date('2024-01-01T09:00:00.000Z').getTime());
      expect(result[0].type).toBe('generated');
      expect(result[1].timestamp).toBe(new Date('2024-01-01T10:00:00.000Z').getTime());
      expect(result[1].value).toBe(10);
      expect(result[4].timestamp).toBe(new Date('2024-01-01T13:00:00.000Z').getTime());
      expect(result[4].type).toBe('generated');
    });

    it('应该正确处理start!=0, end=0的情况', () => {
      const start = new Date('2024-01-01T09:00:00.000Z').getTime();

      const result = fillGaps(baseRecords, 'hour', start, 0, copyLeftRecordGenerator);

      expect(result).toHaveLength(4); // 09:00, 10:00, 11:00, 12:00
      expect(result[0].timestamp).toBe(new Date('2024-01-01T09:00:00.000Z').getTime());
      expect(result[0].type).toBe('generated');
      expect(result[3].timestamp).toBe(new Date('2024-01-01T12:00:00.000Z').getTime());
      expect(result[3].value).toBe(20);
    });

    it('应该正确处理start=0, end!=0的情况', () => {
      const end = new Date('2024-01-01T14:00:00.000Z').getTime();

      const result = fillGaps(baseRecords, 'hour', 0, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(5); // 10:00, 11:00, 12:00, 13:00, 14:00
      expect(result[0].timestamp).toBe(new Date('2024-01-01T10:00:00.000Z').getTime());
      expect(result[0].value).toBe(10);
      expect(result[4].timestamp).toBe(new Date('2024-01-01T14:00:00.000Z').getTime());
      expect(result[4].type).toBe('generated');
    });
  });

  describe('不同粒度的测试', () => {
    it('应该正确处理分钟粒度', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:30:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-01T10:32:00.000Z').getTime(), value: 20 },
      ];

      const start = new Date('2024-01-01T10:30:00.000Z').getTime();
      const end = new Date('2024-01-01T10:32:00.000Z').getTime();

      const result = fillGaps(records, 'minute', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 10:30, 10:31, 10:32
      expect(result[0].value).toBe(10);
      expect(result[1].timestamp).toBe(new Date('2024-01-01T10:31:00.000Z').getTime());
      expect(result[1].type).toBe('generated');
      expect(result[2].value).toBe(20);
    });

    it('应该正确处理天粒度', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T00:00:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-03T00:00:00.000Z').getTime(), value: 30 },
      ];

      const start = new Date('2024-01-01T00:00:00.000Z').getTime();
      const end = new Date('2024-01-03T00:00:00.000Z').getTime();

      const result = fillGaps(records, 'day', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 01-01, 01-02, 01-03
      expect(result[0].value).toBe(10);
      expect(result[1].timestamp).toBe(new Date('2024-01-02T00:00:00.000Z').getTime());
      expect(result[1].type).toBe('generated');
      expect(result[2].value).toBe(30);
    });

    it('应该正确处理月粒度', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T00:00:00.000Z').getTime(), value: 100 },
        { timestamp: new Date('2024-03-01T00:00:00.000Z').getTime(), value: 300 },
      ];

      const start = new Date('2024-01-01T00:00:00.000Z').getTime();
      const end = new Date('2024-03-01T00:00:00.000Z').getTime();

      const result = fillGaps(records, 'month', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 2024-01, 2024-02, 2024-03
      expect(result[0].value).toBe(100);
      expect(result[1].timestamp).toBe(new Date('2024-02-01T00:00:00.000Z').getTime());
      expect(result[1].type).toBe('generated');
      expect(result[2].value).toBe(300);
    });

    it('应该正确处理年粒度', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T00:00:00.000Z').getTime(), value: 2024 },
        { timestamp: new Date('2026-01-01T00:00:00.000Z').getTime(), value: 2026 },
      ];

      const start = new Date('2024-01-01T00:00:00.000Z').getTime();
      const end = new Date('2026-01-01T00:00:00.000Z').getTime();

      const result = fillGaps(records, 'year', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 2024, 2025, 2026
      expect(result[0].value).toBe(2024);
      expect(result[1].timestamp).toBe(new Date('2025-01-01T00:00:00.000Z').getTime());
      expect(result[1].type).toBe('generated');
      expect(result[2].value).toBe(2026);
    });
  });

  describe('生成器函数测试', () => {
    it('应该正确使用生成器函数创建插值记录', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-01T13:00:00.000Z').getTime(), value: 40 },
      ];

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T13:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, fixedValueGenerator(999));

      expect(result).toHaveLength(4); // 10:00, 11:00, 12:00, 13:00
      expect(result[0].value).toBe(10); // 原始记录
      expect(result[1].value).toBe(999); // 生成记录
      expect(result[1].type).toBe('generated');
      expect(result[2].value).toBe(999); // 生成记录
      expect(result[2].type).toBe('generated');
      expect(result[3].value).toBe(40); // 原始记录
    });

    it('应该将左记录传递给生成器函数', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10, type: 'original' },
        { timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(), value: 20, type: 'original' },
      ];

      const customGenerator = (timestamp: number, leftRecord: TestRecord): TestRecord => ({
        timestamp,
        value: leftRecord.value * 2, // 使用左记录的值进行计算
        type: `generated_from_${leftRecord.type}`,
      });

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T12:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, customGenerator);

      expect(result).toHaveLength(3); // 10:00, 11:00, 12:00
      expect(result[0].value).toBe(10);
      expect(result[0].type).toBe('original');
      expect(result[1].value).toBe(20); // 10 * 2
      expect(result[1].type).toBe('generated_from_original');
      expect(result[2].value).toBe(20);
      expect(result[2].type).toBe('original');
    });

    it('应该在有新记录时更新左记录', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-01T11:00:00.000Z').getTime(), value: 15 },
        { timestamp: new Date('2024-01-01T13:00:00.000Z').getTime(), value: 25 },
      ];

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T13:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(4); // 10:00, 11:00, 12:00, 13:00
      expect(result[0].value).toBe(10); // 原始记录
      expect(result[1].value).toBe(15); // 原始记录
      expect(result[2].value).toBe(15); // 生成记录，使用11:00的值
      expect(result[2].type).toBe('generated');
      expect(result[3].value).toBe(25); // 原始记录
    });
  });

  describe('记录排序和去重', () => {
    it('应该正确排序乱序的输入记录', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(), value: 20 },
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-01T11:00:00.000Z').getTime(), value: 15 },
      ];

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T12:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBe(10); // 10:00
      expect(result[1].value).toBe(15); // 11:00
      expect(result[2].value).toBe(20); // 12:00
    });

    it('应该处理时间戳重复的记录', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 10 },
        { timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(), value: 15 }, // 重复时间戳
        { timestamp: new Date('2024-01-01T12:00:00.000Z').getTime(), value: 20 },
      ];

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T12:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3);
      // 应该使用后面的记录（value: 15）
      expect(result[0].value).toBe(15);
    });
  });

  describe('边界条件和特殊情况', () => {
    it('应该处理只在范围外有记录的情况', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(), value: 8 }, // 范围外
        { timestamp: new Date('2024-01-01T14:00:00.000Z').getTime(), value: 14 }, // 范围外
      ];

      const start = new Date('2024-01-01T10:00:00.000Z').getTime();
      const end = new Date('2024-01-01T12:00:00.000Z').getTime();

      const result = fillGaps(records, 'hour', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 10:00, 11:00, 12:00
      // 所有记录都应该是生成的，使用第一个原始记录作为左记录
      expect(result.every(r => r.type === 'generated')).toBe(true);
      expect(result.every(r => r.value === 8)).toBe(true); // 使用第一个记录的值
    });

    it('应该处理跨越多个时间单位的大范围', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-01-01T00:00:00.000Z').getTime(), value: 1 },
        { timestamp: new Date('2024-01-05T00:00:00.000Z').getTime(), value: 5 },
      ];

      const start = new Date('2024-01-01T00:00:00.000Z').getTime();
      const end = new Date('2024-01-05T00:00:00.000Z').getTime();

      const result = fillGaps(records, 'day', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(5); // 01-01, 01-02, 01-03, 01-04, 01-05
      expect(result[0].value).toBe(1);
      expect(result[1].value).toBe(1); // 生成记录，使用左记录值
      expect(result[1].type).toBe('generated');
      expect(result[4].value).toBe(5);
    });

    it('应该正确处理闰年的2月', () => {
      const records: TestRecord[] = [
        { timestamp: new Date('2024-02-01T00:00:00.000Z').getTime(), value: 200 },
        { timestamp: new Date('2024-04-01T00:00:00.000Z').getTime(), value: 400 },
      ];

      const start = new Date('2024-02-01T00:00:00.000Z').getTime();
      const end = new Date('2024-04-01T00:00:00.000Z').getTime();

      const result = fillGaps(records, 'month', start, end, copyLeftRecordGenerator);

      expect(result).toHaveLength(3); // 2024-02, 2024-03, 2024-04
      expect(result[0].value).toBe(200);
      expect(result[1].timestamp).toBe(new Date('2024-03-01T00:00:00.000Z').getTime());
      expect(result[1].type).toBe('generated');
      expect(result[2].value).toBe(400);
    });
  });
}); 