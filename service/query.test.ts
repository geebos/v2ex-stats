import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BalanceRecord, CompactBalanceRecord } from '@/types/types';
import { aggregateBalanceRecordsByTime, fillTimeSeriesGaps, aggregateBalanceRecordsByType, getBalanceRecords, setBalanceRecords } from './query';

describe('aggregateBalanceRecords', () => {
  // 测试数据工厂函数
  const createRecord = (
    timestamp: number,
    balance: number,
    delta: number = 0,
    type: string = 'test',
    username: string = 'testuser'
  ): BalanceRecord => ({
    timestamp,
    balance,
    delta,
    type,
    username
  });

  it('应该返回空数组当输入为空数组时', () => {
    const result = aggregateBalanceRecordsByTime([], 'day');
    expect(result).toEqual([]);
  });

  it('应该返回单条记录当输入只有一条记录时', () => {
    const record = createRecord(1609459200000, 100); // 2021-01-01 00:00:00 UTC
    const result = aggregateBalanceRecordsByTime([record], 'day');
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(record);
  });

  describe('按分钟聚合', () => {
    it('应该将同一分钟内的记录聚合为一条', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1609459230000, 120), // 2021-01-01 00:00:30 UTC (同一分钟)
        createRecord(1609459260000, 150), // 2021-01-01 00:01:00 UTC (下一分钟)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'minute');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1609459260000); // 2021-01-01 00:01:00 UTC (分钟开始时间)
      expect(result[1].timestamp).toBe(1609459200000); // 2021-01-01 00:00:00 UTC (分钟开始时间)
    });
  });

  describe('按小时聚合', () => {
    it('应该将同一小时内的记录聚合为一条', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1609462800000, 120), // 2021-01-01 01:00:00 UTC
        createRecord(1609461600000, 110), // 2021-01-01 00:40:00 UTC (第一小时内)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'hour');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1609462800000); // 2021-01-01 01:00:00 UTC (小时开始时间)
      expect(result[1].timestamp).toBe(1609459200000); // 2021-01-01 00:00:00 UTC (小时开始时间)
    });
  });

  describe('按天聚合', () => {
    it('应该将同一天内的记录聚合为一条', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1609545600000, 200), // 2021-01-02 00:00:00 UTC
        createRecord(1609502400000, 150), // 2021-01-01 12:00:00 UTC (同一天)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'day');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1609545600000); // 2021-01-02 00:00:00 UTC (天开始时间)
      expect(result[1].timestamp).toBe(1609459200000); // 2021-01-01 00:00:00 UTC (天开始时间)
    });
  });

  describe('按月聚合', () => {
    it('应该将同一月内的记录聚合为一条', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1612137600000, 200), // 2021-02-01 00:00:00 UTC
        createRecord(1611532800000, 150), // 2021-01-25 00:00:00 UTC (同一月)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'month');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1612137600000); // 2021-02-01 00:00:00 UTC (月开始时间)
      expect(result[1].timestamp).toBe(1609459200000); // 2021-01-01 00:00:00 UTC (月开始时间)
    });
  });

  describe('按年聚合', () => {
    it('应该将同一年内的记录聚合为一条', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1640995200000, 200), // 2022-01-01 00:00:00 UTC
        createRecord(1625097600000, 150), // 2021-07-01 00:00:00 UTC (同一年)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'year');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1640995200000); // 2022-01-01 00:00:00 UTC (年开始时间)
      expect(result[1].timestamp).toBe(1609459200000); // 2021-01-01 00:00:00 UTC (年开始时间)
    });
  });

  describe('复杂场景测试', () => {
    it('应该正确处理多个时间段的复杂数据', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1609459260000, 110), // 2021-01-01 00:01:00 UTC
        createRecord(1609459230000, 105), // 2021-01-01 00:00:30 UTC (同一分钟内最新)
        createRecord(1609545600000, 200), // 2021-01-02 00:00:00 UTC
        createRecord(1609545660000, 210), // 2021-01-02 00:01:00 UTC
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'minute');
      
      // 按分钟聚合应该有4条记录：
      // 1. 2021-01-01 00:00:XX - 标准化为 00:00:00
      // 2. 2021-01-01 00:01:XX - 标准化为 00:01:00
      // 3. 2021-01-02 00:00:XX - 标准化为 00:00:00
      // 4. 2021-01-02 00:01:XX - 标准化为 00:01:00
      expect(result).toHaveLength(4);
      
      // 验证排序：最新的在前
      expect(result[0].timestamp).toBe(1609545660000); // 2021-01-02 00:01:00 (分钟开始时间)
      expect(result[1].timestamp).toBe(1609545600000); // 2021-01-02 00:00:00 (分钟开始时间)
      expect(result[2].timestamp).toBe(1609459260000); // 2021-01-01 00:01:00 (分钟开始时间)
      expect(result[3].timestamp).toBe(1609459200000); // 2021-01-01 00:00:00 (分钟开始时间)
    });

    it('应该在同一时间段内选择最新的记录', () => {
      const records = [
        createRecord(1609459200000, 100), // 2021-01-01 00:00:00 UTC
        createRecord(1609459230000, 120), // 2021-01-01 00:00:30 UTC (同一天，更新)
        createRecord(1609459210000, 110), // 2021-01-01 00:00:10 UTC (同一天，中间)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'day');
      
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(1609459200000); // 使用标准化的天开始时间
      expect(result[0].balance).toBe(120); // 但数据取最新的记录
    });

    it('应该保持记录的完整性', () => {
      const records = [
        createRecord(1609459200000, 100, 50, '充值', 'user1'),
        createRecord(1609459230000, 120, 20, '消费', 'user1'),
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'day');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        timestamp: 1609459200000, // 使用标准化的天开始时间
        balance: 120, // 余额取最新记录
        delta: 70, // delta 累加同组内所有记录 (50 + 20)
        type: '消费', // 类型取最新记录
        username: 'user1'
      });
    });

    it('应该正确累加同一时间段内的所有 delta 值', () => {
      const records = [
        createRecord(1609459200000, 100, 10, '充值', 'user1'),
        createRecord(1609459230000, 110, 20, '充值', 'user1'),
        createRecord(1609459250000, 90, -30, '消费', 'user1'),
        createRecord(1609459270000, 140, 50, '充值', 'user1'),
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'day');
      
      expect(result).toHaveLength(1);
      expect(result[0].delta).toBe(50); // 10 + 20 + (-30) + 50 = 50
      expect(result[0].balance).toBe(140); // 最新记录的余额
      expect(result[0].type).toBe('充值'); // 最新记录的类型
    });
  });

  describe('时间间隔处理', () => {
    it('应该只返回有数据的时间点', () => {
      const records = [
        createRecord(1609459200000, 100, 10, '充值', 'user1'), // 2021-01-01 00:00:00
        createRecord(1609459320000, 120, 20, '充值', 'user1'), // 2021-01-01 00:02:00 (跳过1分钟)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'minute');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1609459320000); // 00:02:00
      expect(result[1].timestamp).toBe(1609459200000); // 00:00:00
    });

    it('应该正确处理跨小时的数据', () => {
      const records = [
        createRecord(1609459200000, 100, 10, '充值', 'user1'), // 2021-01-01 00:00:00
        createRecord(1609466400000, 150, 50, '充值', 'user1'), // 2021-01-01 02:00:00 (跳过1小时)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'hour');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1609466400000); // 02:00:00
      expect(result[1].timestamp).toBe(1609459200000); // 00:00:00
    });

    it('应该正确处理跨天的数据', () => {
      const records = [
        createRecord(1609459200000, 100, 10, '充值', 'user1'), // 2021-01-01 00:00:00
        createRecord(1609718400000, 200, 100, '充值', 'user1'), // 2021-01-04 00:00:00 (跳过2天)
      ];
      
      const result = aggregateBalanceRecordsByTime(records, 'day');
      
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1609718400000); // 01-04
      expect(result[1].timestamp).toBe(1609459200000); // 01-01
    });
  });
});

describe('fillTimeSeriesGaps', () => {
  // 测试数据工厂函数
  const createRecord = (
    timestamp: number,
    balance: number,
    delta: number = 0,
    type: string = 'test',
    username: string = 'testuser'
  ): BalanceRecord => ({
    timestamp,
    balance,
    delta,
    type,
    username
  });

  it('应该返回空数组当输入为空且未指定时间范围时', () => {
    const result = fillTimeSeriesGaps([], 'minute', 0, 0);
    expect(result).toEqual([]);
  });

  it('应该在指定时间范围内生成完整的时间序列', () => {
    const records = [
      createRecord(1609459200000, 100, 10), // 2021-01-01 00:00:00
      createRecord(1609459320000, 120, 20), // 2021-01-01 00:02:00
    ];
    
    const start = 1609459140000; // 2021-01-01 00:00:00 前1分钟
    const end = 1609459380000;   // 2021-01-01 00:03:00
    
    const result = fillTimeSeriesGaps(records, 'minute', start, end);
    
    // 应该有5条记录: 23:59, 00:00, 00:01, 00:02, 00:03
    expect(result).toHaveLength(5);
    
    // 验证时间序列按降序排列
    expect(result[0].timestamp).toBe(1609459380000); // 00:03:00
    expect(result[1].timestamp).toBe(1609459320000); // 00:02:00 (实际记录)
    expect(result[2].timestamp).toBe(1609459260000); // 00:01:00 (插值)
    expect(result[3].timestamp).toBe(1609459200000); // 00:00:00 (实际记录)
    expect(result[4].timestamp).toBe(1609459140000); // 23:59:00 (插值)
    
    // 验证插值记录的数据
    expect(result[2].balance).toBe(100); // 使用第一个记录的 balance
    expect(result[2].delta).toBe(0);     // delta 为 0
    expect(result[2].type).toBe('test'); // 使用第一个记录的 type
    expect(result[2].username).toBe('testuser');
  });

  it('应该在只指定开始时间时从开始时间填充到最后记录', () => {
    const records = [
      createRecord(1609459320000, 120, 20), // 2021-01-01 00:02:00
    ];
    
    const start = 1609459200000; // 2021-01-01 00:00:00
    
    const result = fillTimeSeriesGaps(records, 'minute', start, 0);
    
    // 应该有3条记录: 00:00, 00:01, 00:02
    expect(result).toHaveLength(3);
    
    expect(result[0].timestamp).toBe(1609459320000); // 00:02:00 (实际记录)
    expect(result[1].timestamp).toBe(1609459260000); // 00:01:00 (插值)
    expect(result[2].timestamp).toBe(1609459200000); // 00:00:00 (插值)
    
    // 验证插值记录使用第一个记录的 balance
    expect(result[1].balance).toBe(120);
    expect(result[2].balance).toBe(120);
  });

  it('应该在只指定结束时间时从第一条记录填充到结束时间', () => {
    const records = [
      createRecord(1609459200000, 100, 10), // 2021-01-01 00:00:00
    ];
    
    const end = 1609459320000; // 2021-01-01 00:02:00
    
    const result = fillTimeSeriesGaps(records, 'minute', 0, end);
    
    // 应该有3条记录: 00:00, 00:01, 00:02
    expect(result).toHaveLength(3);
    
    expect(result[0].timestamp).toBe(1609459320000); // 00:02:00 (插值)
    expect(result[1].timestamp).toBe(1609459260000); // 00:01:00 (插值)
    expect(result[2].timestamp).toBe(1609459200000); // 00:00:00 (实际记录)
    
    // 验证插值记录使用实际记录的 balance
    expect(result[0].balance).toBe(100);
    expect(result[1].balance).toBe(100);
  });

  it('应该在没有记录但指定时间范围时生成插值序列', () => {
    const records: BalanceRecord[] = [];
    
    const start = 1609459200000; // 2021-01-01 00:00:00
    const end = 1609459320000;   // 2021-01-01 00:02:00
    
    const result = fillTimeSeriesGaps(records, 'minute', start, end);
    
    // 应该有3条记录: 00:00, 00:01, 00:02
    expect(result).toHaveLength(3);
    
    // 验证所有记录都是插值记录
    result.forEach(record => {
      expect(record.balance).toBe(0);
      expect(record.delta).toBe(0);
      expect(record.username).toBe('unknown');
      expect(record.type).toBe('interpolated');
    });
  });

  it('应该正确处理按小时粒度的时间范围插值', () => {
    const records = [
      createRecord(1609462800000, 150, 50), // 2021-01-01 01:00:00
    ];
    
    const start = 1609459200000; // 2021-01-01 00:00:00
    const end = 1609466400000;   // 2021-01-01 02:00:00
    
    const result = fillTimeSeriesGaps(records, 'hour', start, end);
    
    // 应该有3条记录: 00:00, 01:00, 02:00
    expect(result).toHaveLength(3);
    
    expect(result[0].timestamp).toBe(1609466400000); // 02:00:00 (插值)
    expect(result[1].timestamp).toBe(1609462800000); // 01:00:00 (实际记录)
    expect(result[2].timestamp).toBe(1609459200000); // 00:00:00 (插值)
    
    // 验证插值记录的数据
    expect(result[0].balance).toBe(150);
    expect(result[2].balance).toBe(150);
  });
});

describe('aggregateBalanceRecordsByType', () => {
  // 测试数据工厂函数
  const createRecord = (
    timestamp: number,
    balance: number,
    delta: number = 0,
    type: string = 'test',
    username: string = 'testuser'
  ): BalanceRecord => ({
    timestamp,
    balance,
    delta,
    type,
    username
  });

  it('应该返回空数组当输入为空数组时', () => {
    const result = aggregateBalanceRecordsByType([]);
    expect(result).toEqual([]);
  });

  it('应该返回单条记录当输入只有一条记录时', () => {
    const record = createRecord(1609459200000, 100, 50, '充值', 'user1');
    const result = aggregateBalanceRecordsByType([record]);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'user1',
      timestamp: 0,
      balance: 0,
      type: '充值',
      delta: 50,
    });
  });

  it('应该将相同类型的记录聚合为一条', () => {
    const records = [
      createRecord(1609459200000, 100, 50, '充值', 'user1'),
      createRecord(1609459260000, 150, 50, '充值', 'user1'),
      createRecord(1609459320000, 200, 50, '充值', 'user1'),
    ];
    
    const result = aggregateBalanceRecordsByType(records);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'user1',
      timestamp: 0,
      balance: 0,
      type: '充值',
      delta: 150, // 50 + 50 + 50 = 150
    });
  });

  it('应该将不同类型的记录分别聚合', () => {
    const records = [
      createRecord(1609459200000, 100, 50, '充值', 'user1'),
      createRecord(1609459260000, 80, -20, '消费', 'user1'),
      createRecord(1609459320000, 150, 70, '充值', 'user1'),
      createRecord(1609459380000, 100, -50, '消费', 'user1'),
    ];
    
    const result = aggregateBalanceRecordsByType(records);
    
    expect(result).toHaveLength(2);
    
    // 找到充值类型的聚合记录
    const topUpRecord = result.find(record => record.type === '充值');
    expect(topUpRecord).toBeDefined();
    expect(topUpRecord!.delta).toBe(120); // 50 + 70 = 120
    expect(topUpRecord!.username).toBe('user1');
    expect(topUpRecord!.timestamp).toBe(0);
    expect(topUpRecord!.balance).toBe(0);
    
    // 找到消费类型的聚合记录
    const consumeRecord = result.find(record => record.type === '消费');
    expect(consumeRecord).toBeDefined();
    expect(consumeRecord!.delta).toBe(-70); // -20 + (-50) = -70
    expect(consumeRecord!.username).toBe('user1');
    expect(consumeRecord!.timestamp).toBe(0);
    expect(consumeRecord!.balance).toBe(0);
  });

  it('应该正确处理多种类型的复杂场景', () => {
    const records = [
      createRecord(1609459200000, 100, 100, '签到', 'user1'),
      createRecord(1609459260000, 80, -20, '消费', 'user1'),
      createRecord(1609459320000, 130, 50, '充值', 'user1'),
      createRecord(1609459380000, 140, 10, '签到', 'user1'),
      createRecord(1609459440000, 90, -50, '消费', 'user1'),
      createRecord(1609459500000, 190, 100, '充值', 'user1'),
      createRecord(1609459560000, 195, 5, '奖励', 'user1'),
    ];
    
    const result = aggregateBalanceRecordsByType(records);
    
    expect(result).toHaveLength(4);
    
    // 验证签到类型
    const signInRecord = result.find(record => record.type === '签到');
    expect(signInRecord!.delta).toBe(110); // 100 + 10 = 110
    
    // 验证消费类型
    const consumeRecord = result.find(record => record.type === '消费');
    expect(consumeRecord!.delta).toBe(-70); // -20 + (-50) = -70
    
    // 验证充值类型
    const topUpRecord = result.find(record => record.type === '充值');
    expect(topUpRecord!.delta).toBe(150); // 50 + 100 = 150
    
    // 验证奖励类型
    const rewardRecord = result.find(record => record.type === '奖励');
    expect(rewardRecord!.delta).toBe(5); // 5
  });

  it('应该正确处理负数 delta 值', () => {
    const records = [
      createRecord(1609459200000, 100, -10, '扣除', 'user1'),
      createRecord(1609459260000, 80, -20, '扣除', 'user1'),
      createRecord(1609459320000, 50, -30, '扣除', 'user1'),
    ];
    
    const result = aggregateBalanceRecordsByType(records);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'user1',
      timestamp: 0,
      balance: 0,
      type: '扣除',
      delta: -60, // -10 + (-20) + (-30) = -60
    });
  });

  it('应该正确处理零 delta 值', () => {
    const records = [
      createRecord(1609459200000, 100, 0, '查询', 'user1'),
      createRecord(1609459260000, 100, 0, '查询', 'user1'),
      createRecord(1609459320000, 100, 10, '充值', 'user1'),
    ];
    
    const result = aggregateBalanceRecordsByType(records);
    
    expect(result).toHaveLength(2);
    
    const queryRecord = result.find(record => record.type === '查询');
    expect(queryRecord!.delta).toBe(0); // 0 + 0 = 0
    
    const topUpRecord = result.find(record => record.type === '充值');
    expect(topUpRecord!.delta).toBe(10);
  });

  it('应该使用每个类型组中第一条记录的用户名', () => {
    const records = [
      createRecord(1609459200000, 100, 50, '充值', 'user1'),
      createRecord(1609459260000, 150, 50, '充值', 'user2'), // 同类型但不同用户
      createRecord(1609459320000, 80, -20, '消费', 'user3'),
    ];
    
    const result = aggregateBalanceRecordsByType(records);
    
    expect(result).toHaveLength(2);
    
    const topUpRecord = result.find(record => record.type === '充值');
    expect(topUpRecord!.username).toBe('user1'); // 使用第一条记录的用户名
    expect(topUpRecord!.delta).toBe(100); // 50 + 50 = 100
    
    const consumeRecord = result.find(record => record.type === '消费');
    expect(consumeRecord!.username).toBe('user3');
  });
});

// Mock storage module
vi.mock('@wxt-dev/storage', () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  }
}));

import { storage } from '@wxt-dev/storage';

describe('getBalanceRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 测试数据工厂函数
  const createCompactRecord = (
    timestamp: number,
    typeId: number,
    delta: number,
    balance: number
  ): CompactBalanceRecord => [timestamp, typeId, delta, balance];

  const createExpectedRecord = (
    timestamp: number,
    type: string,
    delta: number,
    balance: number,
    username: string = 'testuser'
  ): BalanceRecord => ({
    timestamp,
    type,
    delta,
    balance,
    username
  });

  it('应该正确将压缩记录转换为 BalanceRecord', async () => {
    const username = 'testuser';
    const keys = ['local:balanceRecords:testuser|2024|01'] as any[];
    
    // Mock 压缩记录数据
    const compactRecords: CompactBalanceRecord[] = [
      createCompactRecord(1609459200000, 10, 50, 150),
      createCompactRecord(1609459260000, 11, 20, 170),
    ];
    
    // Mock storage.getItem 返回压缩记录
    vi.mocked(storage.getItem).mockResolvedValueOnce(compactRecords);
    
    // Mock 类型映射 - 使用预定义的类型
    // 由于 getBalanceRecordTypeValue 是内部函数且使用了预定义类型，10 对应 "每日活跃度奖励"，11 对应 "每日登录奖励"
    
    const result = await getBalanceRecords(username, keys);
    
    expect(storage.getItem).toHaveBeenCalledWith('local:balanceRecords:testuser|2024|01');
    expect(result).toHaveLength(2);
    
    // 验证结果按时间戳降序排列
    expect(result[0]).toEqual(createExpectedRecord(1609459260000, '每日登录奖励', 20, 170, username));
    expect(result[1]).toEqual(createExpectedRecord(1609459200000, '每日活跃度奖励', 50, 150, username));
  });

  it('应该处理多个存储键', async () => {
    const username = 'testuser';
    const keys = [
      'local:balanceRecords:testuser|2024|01',
      'local:balanceRecords:testuser|2024|02'
    ] as any[];
    
    const compactRecords1: CompactBalanceRecord[] = [
      createCompactRecord(1609459200000, 12, 30, 100),
    ];
    
    const compactRecords2: CompactBalanceRecord[] = [
      createCompactRecord(1612137600000, 13, 40, 140),
    ];
    
    vi.mocked(storage.getItem)
      .mockResolvedValueOnce(compactRecords1)
      .mockResolvedValueOnce(compactRecords2);
    
    const result = await getBalanceRecords(username, keys);
    
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    
    // 验证结果按时间戳降序排列
    expect(result[0].timestamp).toBe(1612137600000); // 2月的记录在前
    expect(result[1].timestamp).toBe(1609459200000); // 1月的记录在后
  });

  it('应该处理空的存储记录', async () => {
    const username = 'testuser';
    const keys = ['local:balanceRecords:testuser|2024|01'] as any[];
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(null);
    
    const result = await getBalanceRecords(username, keys);
    
    expect(result).toEqual([]);
  });

  it('应该处理不存在的存储键', async () => {
    const username = 'testuser';
    const keys = [
      'local:balanceRecords:testuser|2024|01',
      'local:balanceRecords:testuser|2024|02'
    ] as any[];
    
    vi.mocked(storage.getItem)
      .mockResolvedValueOnce([createCompactRecord(1609459200000, 10, 50, 150)])
      .mockResolvedValueOnce(null); // 第二个键不存在
    
    const result = await getBalanceRecords(username, keys);
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('每日活跃度奖励');
  });

  it('应该处理空的键数组', async () => {
    const username = 'testuser';
    const keys: any[] = [];
    
    const result = await getBalanceRecords(username, keys);
    
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe('setBalanceRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 测试数据工厂函数
  const createRecord = (
    timestamp: number,
    type: string,
    delta: number,
    balance: number,
    username: string = 'testuser'
  ): BalanceRecord => ({
    timestamp,
    type,
    delta,
    balance,
    username
  });

  it('应该正确将 BalanceRecord 压缩并存储', async () => {
    const key = 'local:balanceRecords:testuser|2024|01' as any;
    const records: BalanceRecord[] = [
      createRecord(1609459200000, '每日活跃度奖励', 50, 150),
      createRecord(1609459260000, '每日登录奖励', 20, 170),
    ];
    
    // Mock storage.getItem 用于获取现有的类型记录
    vi.mocked(storage.getItem).mockResolvedValue([]);
    
    await setBalanceRecords(key, records);
    
    expect(storage.setItem).toHaveBeenCalledWith(key, [
      [1609459260000, 11, 20, 170], // 按时间戳降序排列，11 是 "每日登录奖励" 的ID
      [1609459200000, 10, 50, 150], // 10 是 "每日活跃度奖励" 的ID
    ]);
  });

  it('应该按时间戳降序排列记录', async () => {
    const key = 'local:balanceRecords:testuser|2024|01' as any;
    const records: BalanceRecord[] = [
      createRecord(1609459200000, '每日活跃度奖励', 50, 150),  // 较早的记录
      createRecord(1609459320000, '创建回复', 30, 200),        // 最新的记录
      createRecord(1609459260000, '每日登录奖励', 20, 170),    // 中间的记录
    ];
    
    vi.mocked(storage.getItem).mockResolvedValue([]);
    
    await setBalanceRecords(key, records);
    
    const expectedCompactRecords = [
      [1609459320000, 13, 30, 200], // 最新的记录排在第一位
      [1609459260000, 11, 20, 170], // 中间的记录
      [1609459200000, 10, 50, 150], // 最早的记录排在最后
    ];
    
    expect(storage.setItem).toHaveBeenCalledWith(key, expectedCompactRecords);
  });

  it('应该处理新的类型记录', async () => {
    const key = 'local:balanceRecords:testuser|2024|01' as any;
    const records: BalanceRecord[] = [
      createRecord(1609459200000, '新类型', 50, 150),
    ];
    
    // Mock 初次查询返回空数组，然后模拟新类型被添加
    vi.mocked(storage.getItem)
      .mockResolvedValueOnce([]) // 第一次查询类型记录为空
      .mockResolvedValueOnce([{ id: 0, value: '新类型' }]); // 设置新类型后查询
    
    await setBalanceRecords(key, records);
    
    // 验证新类型被保存
    expect(storage.setItem).toHaveBeenCalledWith(
      'local:balanceRecordTypes', 
      [{ id: 0, value: '新类型' }]
    );
    
    // 验证记录被保存，新类型的ID是0
    expect(storage.setItem).toHaveBeenCalledWith(key, [
      [1609459200000, 0, 50, 150]
    ]);
  });

  it('应该处理空记录数组', async () => {
    const key = 'local:balanceRecords:testuser|2024|01' as any;
    const records: BalanceRecord[] = [];
    
    await setBalanceRecords(key, records);
    
    expect(storage.setItem).toHaveBeenCalledWith(key, []);
  });

  it('应该处理单条记录', async () => {
    const key = 'local:balanceRecords:testuser|2024|01' as any;
    const records: BalanceRecord[] = [
      createRecord(1609459200000, '每日活跃度奖励', 50, 150),
    ];
    
    vi.mocked(storage.getItem).mockResolvedValue([]);
    
    await setBalanceRecords(key, records);
    
    expect(storage.setItem).toHaveBeenCalledWith(key, [
      [1609459200000, 10, 50, 150]
    ]);
  });

  it('应该正确处理混合类型的记录', async () => {
    const key = 'local:balanceRecords:testuser|2024|01' as any;
    const records: BalanceRecord[] = [
      createRecord(1609459200000, '每日活跃度奖励', 10, 100),
      createRecord(1609459260000, '每日登录奖励', 20, 120), 
      createRecord(1609459320000, '主题回复收益', 15, 135),
      createRecord(1609459380000, '创建回复', 5, 140),
    ];
    
    vi.mocked(storage.getItem).mockResolvedValue([]);
    
    await setBalanceRecords(key, records);
    
    const expectedCompactRecords = [
      [1609459380000, 13, 5, 140],   // 创建回复
      [1609459320000, 12, 15, 135],  // 主题回复收益
      [1609459260000, 11, 20, 120],  // 每日登录奖励
      [1609459200000, 10, 10, 100],  // 每日活跃度奖励
    ];
    
    expect(storage.setItem).toHaveBeenCalledWith(key, expectedCompactRecords);
  });
});