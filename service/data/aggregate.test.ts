import { describe, it, expect } from 'vitest';
import { aggreateByTime, aggregateByKey } from './aggregate';
import { TimeSeriesRecord } from './types';
import { BalanceRecord, Granularity } from '@/types/types';

// 测试数据接口
interface TestTimeRecord extends TimeSeriesRecord {
  value: number;
  type?: string;
}

describe('aggreateByTime', () => {
  // 创建测试聚合器函数
  const sumAggregator = (timestamp: number, group: TestTimeRecord[]): TestTimeRecord => ({
    timestamp,
    value: group.reduce((sum, record) => sum + record.value, 0),
  });

  it('应该正确处理空数组', () => {
    const result = aggreateByTime([], 'hour', sumAggregator);
    expect(result).toEqual([]);
  });

  it('应该按分钟粒度聚合记录', () => {
    const records: TestTimeRecord[] = [
      { timestamp: new Date('2024-01-01T10:30:15Z').getTime(), value: 10 },
      { timestamp: new Date('2024-01-01T10:30:45Z').getTime(), value: 20 },
      { timestamp: new Date('2024-01-01T10:31:10Z').getTime(), value: 30 },
    ];

    const result = aggreateByTime(records, 'minute', sumAggregator);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: new Date('2024-01-01T10:30:00Z').getTime(),
      value: 30, // 10 + 20
    });
    expect(result[1]).toEqual({
      timestamp: new Date('2024-01-01T10:31:00Z').getTime(),
      value: 30,
    });
  });

  it('应该按小时粒度聚合记录', () => {
    const records: TestTimeRecord[] = [
      { timestamp: new Date('2024-01-01T10:15:30Z').getTime(), value: 10 },
      { timestamp: new Date('2024-01-01T10:45:20Z').getTime(), value: 20 },
      { timestamp: new Date('2024-01-01T11:20:10Z').getTime(), value: 30 },
    ];

    const result = aggreateByTime(records, 'hour', sumAggregator);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: new Date('2024-01-01T10:00:00Z').getTime(),
      value: 30, // 10 + 20
    });
    expect(result[1]).toEqual({
      timestamp: new Date('2024-01-01T11:00:00Z').getTime(),
      value: 30,
    });
  });

  it('应该按天粒度聚合记录', () => {
    const records: TestTimeRecord[] = [
      { timestamp: new Date('2024-01-01T08:30:00Z').getTime(), value: 10 },
      { timestamp: new Date('2024-01-01T15:45:00Z').getTime(), value: 20 },
      { timestamp: new Date('2024-01-02T10:20:00Z').getTime(), value: 30 },
    ];

    const result = aggreateByTime(records, 'day', sumAggregator);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
      value: 30, // 10 + 20
    });
    expect(result[1]).toEqual({
      timestamp: new Date('2024-01-02T00:00:00Z').getTime(),
      value: 30,
    });
  });

  it('应该按月粒度聚合记录', () => {
    const records: TestTimeRecord[] = [
      { timestamp: new Date('2024-01-15T10:30:00Z').getTime(), value: 10 },
      { timestamp: new Date('2024-01-28T15:45:00Z').getTime(), value: 20 },
      { timestamp: new Date('2024-02-10T08:20:00Z').getTime(), value: 30 },
    ];

    const result = aggreateByTime(records, 'month', sumAggregator);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
      value: 30, // 10 + 20
    });
    expect(result[1]).toEqual({
      timestamp: new Date('2024-02-01T00:00:00Z').getTime(),
      value: 30,
    });
  });

  it('应该按年粒度聚合记录', () => {
    const records: TestTimeRecord[] = [
      { timestamp: new Date('2024-03-15T10:30:00Z').getTime(), value: 10 },
      { timestamp: new Date('2024-08-28T15:45:00Z').getTime(), value: 20 },
      { timestamp: new Date('2025-02-10T08:20:00Z').getTime(), value: 30 },
    ];

    const result = aggreateByTime(records, 'year', sumAggregator);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
      value: 30, // 10 + 20
    });
    expect(result[1]).toEqual({
      timestamp: new Date('2025-01-01T00:00:00Z').getTime(),
      value: 30,
    });
  });

  it('应该正确处理跨时区的时间', () => {
    const records: TestTimeRecord[] = [
      { timestamp: new Date('2024-01-01T23:30:00Z').getTime(), value: 10 },
      { timestamp: new Date('2024-01-02T00:30:00Z').getTime(), value: 20 },
    ];

    const result = aggreateByTime(records, 'day', sumAggregator);

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    expect(result[1].timestamp).toBe(new Date('2024-01-02T00:00:00Z').getTime());
  });

  it('应该处理BalanceRecord类型的聚合', () => {
    const balanceAggregator = (timestamp: number, group: BalanceRecord[]): BalanceRecord => {
      const latestRecord = group[group.length - 1];
      return {
        timestamp,
        type: 'aggregated',
        delta: group.reduce((sum, record) => sum + record.delta, 0),
        balance: latestRecord.balance,
        username: latestRecord.username,
      };
    };

    const records: BalanceRecord[] = [
      { timestamp: new Date('2024-01-01T10:30:00Z').getTime(), type: '登录奖励', delta: 10, balance: 110, username: 'user1' },
      { timestamp: new Date('2024-01-01T10:45:00Z').getTime(), type: '回复奖励', delta: 5, balance: 115, username: 'user1' },
      { timestamp: new Date('2024-01-01T11:30:00Z').getTime(), type: '发帖奖励', delta: 20, balance: 135, username: 'user1' },
    ];

    const result = aggreateByTime(records, 'hour', balanceAggregator);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      timestamp: new Date('2024-01-01T10:00:00Z').getTime(),
      type: 'aggregated',
      delta: 15, // 10 + 5
      balance: 115, // 最新记录的余额
      username: 'user1',
    });
    expect(result[1]).toEqual({
      timestamp: new Date('2024-01-01T11:00:00Z').getTime(),
      type: 'aggregated',
      delta: 20,
      balance: 135,
      username: 'user1',
    });
  });
});

describe('aggregateByKey', () => {
  interface TestRecord {
    type: string;
    value: number;
    count?: number;
  }

  const sumByTypeAggregator = (key: string, group: TestRecord[]): TestRecord => ({
    type: key,
    value: group.reduce((sum, record) => sum + record.value, 0),
    count: group.length,
  });

  it('应该正确处理空数组', () => {
    const result = aggregateByKey([], (record: TestRecord) => record.type, sumByTypeAggregator);
    expect(result).toEqual([]);
  });

  it('应该按键值正确聚合记录', () => {
    const records: TestRecord[] = [
      { type: '登录奖励', value: 10 },
      { type: '回复奖励', value: 5 },
      { type: '登录奖励', value: 10 },
      { type: '发帖奖励', value: 20 },
      { type: '回复奖励', value: 8 },
    ];

    const result = aggregateByKey(records, (record) => record.type, sumByTypeAggregator);

    expect(result).toHaveLength(3);
    
    // 找到每个类型的聚合结果
    const loginReward = result.find(r => r.type === '登录奖励');
    const replyReward = result.find(r => r.type === '回复奖励');
    const postReward = result.find(r => r.type === '发帖奖励');

    expect(loginReward).toEqual({ type: '登录奖励', value: 20, count: 2 });
    expect(replyReward).toEqual({ type: '回复奖励', value: 13, count: 2 });
    expect(postReward).toEqual({ type: '发帖奖励', value: 20, count: 1 });
  });

  it('应该处理单一键值的记录', () => {
    const records: TestRecord[] = [
      { type: '登录奖励', value: 10 },
      { type: '登录奖励', value: 15 },
      { type: '登录奖励', value: 8 },
    ];

    const result = aggregateByKey(records, (record) => record.type, sumByTypeAggregator);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: '登录奖励', value: 33, count: 3 });
  });

  it('应该处理每个键值只有一条记录的情况', () => {
    const records: TestRecord[] = [
      { type: '登录奖励', value: 10 },
      { type: '回复奖励', value: 5 },
      { type: '发帖奖励', value: 20 },
    ];

    const result = aggregateByKey(records, (record) => record.type, sumByTypeAggregator);

    expect(result).toHaveLength(3);
    expect(result.find(r => r.type === '登录奖励')).toEqual({ type: '登录奖励', value: 10, count: 1 });
    expect(result.find(r => r.type === '回复奖励')).toEqual({ type: '回复奖励', value: 5, count: 1 });
    expect(result.find(r => r.type === '发帖奖励')).toEqual({ type: '发帖奖励', value: 20, count: 1 });
  });

  it('应该处理BalanceRecord类型的按类型聚合', () => {
    const balanceByTypeAggregator = (key: string, group: BalanceRecord[]): BalanceRecord => {
      const latestRecord = group[group.length - 1];
      return {
        timestamp: latestRecord.timestamp,
        type: key,
        delta: group.reduce((sum, record) => sum + record.delta, 0),
        balance: latestRecord.balance,
        username: latestRecord.username,
      };
    };

    const records: BalanceRecord[] = [
      { timestamp: 1640000000000, type: '每日登录奖励', delta: 10, balance: 110, username: 'user1' },
      { timestamp: 1640000060000, type: '主题回复收益', delta: 5, balance: 115, username: 'user1' },
      { timestamp: 1640000120000, type: '每日登录奖励', delta: 10, balance: 125, username: 'user1' },
      { timestamp: 1640000180000, type: '创建回复', delta: 3, balance: 128, username: 'user1' },
    ];

    const result = aggregateByKey(records, (record) => record.type, balanceByTypeAggregator);

    expect(result).toHaveLength(3);

    const loginReward = result.find(r => r.type === '每日登录奖励');
    const replyIncome = result.find(r => r.type === '主题回复收益');
    const createReply = result.find(r => r.type === '创建回复');

    expect(loginReward).toEqual({
      timestamp: 1640000120000, // 最新记录的时间戳
      type: '每日登录奖励',
      delta: 20, // 10 + 10
      balance: 125, // 最新记录的余额
      username: 'user1',
    });

    expect(replyIncome).toEqual({
      timestamp: 1640000060000,
      type: '主题回复收益',
      delta: 5,
      balance: 115,
      username: 'user1',
    });

    expect(createReply).toEqual({
      timestamp: 1640000180000,
      type: '创建回复',
      delta: 3,
      balance: 128,
      username: 'user1',
    });
  });

  it('应该支持自定义键值提取函数', () => {
    interface UserRecord {
      username: string;
      score: number;
      level: string;
    }

    const records: UserRecord[] = [
      { username: 'user1', score: 100, level: 'gold' },
      { username: 'user2', score: 80, level: 'silver' },
      { username: 'user3', score: 120, level: 'gold' },
      { username: 'user4', score: 60, level: 'bronze' },
      { username: 'user5', score: 90, level: 'silver' },
    ];

    const aggregator = (level: string, group: UserRecord[]): UserRecord => ({
      username: `${level}_group`,
      score: group.reduce((sum, record) => sum + record.score, 0),
      level,
    });

    const result = aggregateByKey(records, (record) => record.level, aggregator);

    expect(result).toHaveLength(3);
    expect(result.find(r => r.level === 'gold')).toEqual({ username: 'gold_group', score: 220, level: 'gold' });
    expect(result.find(r => r.level === 'silver')).toEqual({ username: 'silver_group', score: 170, level: 'silver' });
    expect(result.find(r => r.level === 'bronze')).toEqual({ username: 'bronze_group', score: 60, level: 'bronze' });
  });
}); 