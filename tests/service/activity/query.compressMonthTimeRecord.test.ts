import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UsedTimeRecord } from '@/types/types';

// Mock storage 模块
vi.mock('@wxt-dev/storage', () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  }
}));

// Mock service/utils 模块
vi.mock('@/service/utils', () => ({
  getMonthStartTimestamp: vi.fn(),
  getMonthEndTimestamp: vi.fn(),
  getHourStartTimestamp: vi.fn(),
}));

// Mock service/data/aggregate 模块
vi.mock('@/service/data/aggregate', () => ({
  aggreateByTime: vi.fn(),
  aggregateByKey: vi.fn(),
}));

import { storage } from '@wxt-dev/storage';
import { compressMonthTimeRecord, getCurrentMonthKey, type HourlyRecord, type MonthAggData } from '@/service/activity/query';
import { getMonthStartTimestamp, getMonthEndTimestamp } from '@/service/utils';
import { aggreateByTime, aggregateByKey } from '@/service/data/aggregate';

describe('compressMonthTimeRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清理控制台 mock
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock Date.now() 返回固定值
    vi.spyOn(Date, 'now').mockReturnValue(1612137600000); // 2021-02-01 00:00:00 UTC
    
    // Mock工具函数返回值
    vi.mocked(getMonthStartTimestamp).mockReturnValue(1612137600000); // 2021-02-01 00:00:00 UTC
    vi.mocked(getMonthEndTimestamp).mockReturnValue(1612223999999); // 2021-01-31 23:59:59.999 UTC
  });

  // 测试数据工厂函数
  const createRecord = (timestamp: number, seconds: number): UsedTimeRecord => ({
    timestamp,
    seconds
  });

  const createHourlyRecord = (hour: number, seconds: number): HourlyRecord => ({
    hour,
    seconds
  });

  describe('错误处理', () => {
    it('应该在没有时间记录时返回', async () => {
      const username = 'testuser';
      
      // Mock storage.getItem 返回null
      vi.mocked(storage.getItem).mockResolvedValueOnce(null);
      
      await compressMonthTimeRecord(username);
      
      expect(storage.getItem).toHaveBeenCalledWith(getCurrentMonthKey(username));
      expect(console.error).toHaveBeenCalledWith('压缩月记录，未找到记录');
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('应该在时间记录为空数组时返回', async () => {
      const username = 'testuser';
      
      // Mock storage.getItem 返回空数组
      vi.mocked(storage.getItem).mockResolvedValueOnce([]);
      
      await compressMonthTimeRecord(username);
      
      expect(console.error).toHaveBeenCalledWith('压缩月记录，未找到记录');
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('应该在没有找到currentMonthStart时返回', async () => {
      const username = 'testuser';
      const timeRecords = [createRecord(1609459200000, 300)];
      
      // Mock storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords) // 获取时间记录
        .mockResolvedValueOnce(0); // currentMonthStart为0
      
      await compressMonthTimeRecord(username);
      
      expect(console.error).toHaveBeenCalledWith('压缩月记录，未找到 currentMonthStart');
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('应该在没有需要压缩的记录时返回', async () => {
      const username = 'testuser';
      // 设置一个很早的currentMonthStart时间，这样当前时间的记录都不会被压缩
      const oldMonthStart = 1577836800000; // 2020-01-01 00:00:00 UTC
      const oldMonthEnd = 1580515199999; // 2020-01-31 23:59:59.999 UTC
      
      // Mock getMonthEndTimestamp 返回很早的时间
      vi.mocked(getMonthEndTimestamp).mockReturnValue(oldMonthEnd);
      
      const timeRecords = [
        createRecord(1612137600000, 300), // 2021-02-01 00:00:00 UTC，比压缩时间范围晚
        createRecord(1612144800000, 400)  // 2021-02-01 02:00:00 UTC，比压缩时间范围晚
      ];
      
      // Mock storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords) // 获取时间记录
        .mockResolvedValueOnce(oldMonthStart); // currentMonthStart (2020-01-01)
      
      await compressMonthTimeRecord(username);
      
      expect(console.log).toHaveBeenCalledWith('压缩月记录，没有需要压缩的记录');
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('正常压缩流程', () => {
    it('应该正确压缩记录并创建新的年度聚合数据', async () => {
      const username = 'testuser';
      const recordedCurrentMonthStart = 1609459200000; // 2021-01-01 00:00:00 UTC
      const recordedCurrentMonthEnd = 1612137599999; // 2021-01-31 23:59:59.999 UTC
      
      // 重新mock getMonthEndTimestamp
      vi.mocked(getMonthEndTimestamp).mockReturnValue(recordedCurrentMonthEnd);
      
      const timeRecords = [
        createRecord(1609459200000, 1800), // 2021-01-01 00:00:00 UTC - 30分钟（需要压缩）
        createRecord(1609462800000, 3600), // 2021-01-01 01:00:00 UTC - 1小时（需要压缩）
        createRecord(1609466400000, 900),  // 2021-01-01 02:00:00 UTC - 15分钟（需要压缩）
        createRecord(1612137600000, 1200)  // 2021-02-01 00:00:00 UTC - 20分钟（不需要压缩）
      ];
      
      // 需要压缩的记录（只有前3条）
      const needCompressedRecords = timeRecords.slice(0, 3);
      
      // Mock 聚合函数返回值
      const mockHourlyRecords = [
        createHourlyRecord(0, 1800),
        createHourlyRecord(1, 3600),
        createHourlyRecord(2, 900)
      ];
      
      const mockDailyRecords = [
        createRecord(1609459200000, 6300) // 总计 1小时45分钟
      ];
      
      vi.mocked(aggregateByKey).mockReturnValue(mockHourlyRecords);
      vi.mocked(aggreateByTime).mockReturnValue(mockDailyRecords);
      
      // Mock storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords) // 获取时间记录
        .mockResolvedValueOnce(recordedCurrentMonthStart) // currentMonthStart
        .mockResolvedValueOnce(null); // 年度聚合数据不存在
      
      await compressMonthTimeRecord(username);
      
      // 验证正确的函数调用
      expect(aggregateByKey).toHaveBeenCalledWith(
        needCompressedRecords, // 只有需要压缩的记录
        expect.any(Function),
        expect.any(Function)
      );
      
      expect(aggreateByTime).toHaveBeenCalledWith(
        needCompressedRecords,
        'day',
        expect.any(Function)
      );
      
      // 验证构建的月度聚合数据
      const expectedMonthAggData: MonthAggData = {
        month: 0, // 1月 (从0开始)
        hourlyRecords: mockHourlyRecords,
        dailyRecords: mockDailyRecords
      };
      
      // 获取实际的年份（基于实际运行环境的时区）
      const actualYear = new Date(recordedCurrentMonthStart).getFullYear();
      const actualMonth = new Date(recordedCurrentMonthStart).getMonth();
      
      // 使用实际计算出的值进行验证
      const expectedMonthAggDataActual: MonthAggData = {
        month: actualMonth,
        hourlyRecords: mockHourlyRecords,
        dailyRecords: mockDailyRecords
      };
      
      // 验证存储调用
      const yearKey = `local:currentYearMonthAggData:testuser:${actualYear}`;
      expect(storage.setItem).toHaveBeenNthCalledWith(1, yearKey, [expectedMonthAggDataActual]);
      expect(storage.setItem).toHaveBeenNthCalledWith(2, `local:currentMonthStart:${username}`, 1612137600000);
      expect(storage.setItem).toHaveBeenNthCalledWith(3, getCurrentMonthKey(username), [timeRecords[3]]);
    });

    it('应该正确压缩记录并追加到现有年度聚合数据', async () => {
      const username = 'testuser';
      const recordedCurrentMonthStart = 1609459200000; // 2021-01-01 00:00:00 UTC
      const recordedCurrentMonthEnd = 1612137599999; // 2021-01-31 23:59:59.999 UTC
      
      // 重新mock getMonthEndTimestamp
      vi.mocked(getMonthEndTimestamp).mockReturnValue(recordedCurrentMonthEnd);
      
      const timeRecords = [
        createRecord(1609459200000, 1800), // 需要压缩的记录
        createRecord(1612137600000, 1200)  // 不需要压缩的记录
      ];
      
      // 获取实际的年份和月份（基于运行环境的时区）
      const actualYear = new Date(recordedCurrentMonthStart).getFullYear();
      const actualMonth = new Date(recordedCurrentMonthStart).getMonth();
      
      // 现有的年度聚合数据
      const existingYearData: MonthAggData[] = [
        {
          month: 10, // 11月 - 确保与新数据不同
          hourlyRecords: [createHourlyRecord(10, 3600)],  
          dailyRecords: [createRecord(1608163200000, 3600)]
        }
      ];
      
      // Mock 聚合函数返回值
      const mockHourlyRecords = [createHourlyRecord(0, 1800)];
      const mockDailyRecords = [createRecord(1609459200000, 1800)];
      
      vi.mocked(aggregateByKey).mockReturnValue(mockHourlyRecords);
      vi.mocked(aggreateByTime).mockReturnValue(mockDailyRecords);
      
      // Mock storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords) // 获取时间记录
        .mockResolvedValueOnce(recordedCurrentMonthStart) // currentMonthStart
        .mockResolvedValueOnce(existingYearData); // 现有年度聚合数据
      
      await compressMonthTimeRecord(username);
      
      // 验证存储被调用
      const yearKey = `local:currentYearMonthAggData:testuser:${actualYear}`;
      expect(storage.setItem).toHaveBeenNthCalledWith(1, yearKey, expect.any(Array));
      
      // 获取实际存储的数据 - 年度聚合数据存储是第一次调用
      const yearDataCall = vi.mocked(storage.setItem).mock.calls.find(call => call[0] === yearKey);
      expect(yearDataCall).toBeDefined();
      const storedData = yearDataCall![1] as MonthAggData[];
      
      // 验证数组长度为2（原有1个 + 新增1个）
      expect(storedData).toHaveLength(2);
      
      // 验证包含了原有数据
      expect(storedData[0]).toEqual(existingYearData[0]);
      
      // 验证新增数据的结构
      const newMonthData = storedData[1];
      expect(newMonthData.month).toBe(actualMonth);
      expect(newMonthData.hourlyRecords).toEqual(mockHourlyRecords);
      expect(newMonthData.dailyRecords).toEqual(mockDailyRecords);
    });

    it('应该正确处理跨年的压缩场景', async () => {
      const username = 'testuser';
      const recordedCurrentMonthStart = 1609459200000; // 2021-01-01 00:00:00 UTC
      
      const timeRecords = [createRecord(1609459200000, 1800)];
      
      // Mock 聚合函数返回值
      const mockHourlyRecords = [createHourlyRecord(0, 1800)];
      const mockDailyRecords = [createRecord(1609459200000, 1800)];
      
      vi.mocked(aggregateByKey).mockReturnValue(mockHourlyRecords);
      vi.mocked(aggreateByTime).mockReturnValue(mockDailyRecords);
      
      // Mock storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords)
        .mockResolvedValueOnce(recordedCurrentMonthStart)
        .mockResolvedValueOnce(null);
      
      await compressMonthTimeRecord(username);
      
      // 获取实际的年份
      const actualYear = new Date(recordedCurrentMonthStart).getFullYear();
      
      // 验证使用了正确的年份作为存储键
      const yearKey = `local:currentYearMonthAggData:testuser:${actualYear}`;
      expect(storage.setItem).toHaveBeenCalledWith(yearKey, expect.any(Array));
    });
  });

  describe('聚合逻辑验证', () => {
    it('应该正确调用小时粒度聚合函数', async () => {
      const username = 'testuser';
      const recordedCurrentMonthStart = 1609459200000;
      
      const timeRecords = [
        createRecord(1609459200000, 1800), // 2021-01-01 00:00:00 UTC
        createRecord(1609462800000, 3600), // 2021-01-01 01:00:00 UTC
        createRecord(1609466400000, 900)   // 2021-01-01 02:00:00 UTC
      ];
      
      vi.mocked(aggregateByKey).mockReturnValue([]);
      vi.mocked(aggreateByTime).mockReturnValue([]);
      
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords)
        .mockResolvedValueOnce(recordedCurrentMonthStart)
        .mockResolvedValueOnce(null);
      
      await compressMonthTimeRecord(username);
      
      // 验证aggregateByKey被正确调用
      expect(aggregateByKey).toHaveBeenCalledWith(
        timeRecords,
        expect.any(Function), // hourlyKey函数
        expect.any(Function)  // hourlyAggregator函数
      );
      
      // 测试hourlyKey函数 - 获取实际的小时值
      const hourlyKeyCall = vi.mocked(aggregateByKey).mock.calls[0][1];
      const actualHour0 = hourlyKeyCall(timeRecords[0]) as number;
      const actualHour1 = hourlyKeyCall(timeRecords[1]) as number;
      const actualHour2 = hourlyKeyCall(timeRecords[2]) as number;
      
      // 验证小时递增关系（不依赖具体的时区值）
      expect(actualHour1).toBe(actualHour0 + 1);
      expect(actualHour2).toBe(actualHour0 + 2);
    });

    it('应该正确调用天粒度聚合函数', async () => {
      const username = 'testuser';
      const recordedCurrentMonthStart = 1609459200000;
      const timeRecords = [createRecord(1609459200000, 1800)];
      
      vi.mocked(aggregateByKey).mockReturnValue([]);
      vi.mocked(aggreateByTime).mockReturnValue([]);
      
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords)
        .mockResolvedValueOnce(recordedCurrentMonthStart)
        .mockResolvedValueOnce(null);
      
      await compressMonthTimeRecord(username);
      
      // 验证aggreateByTime被正确调用
      expect(aggreateByTime).toHaveBeenCalledWith(
        timeRecords,
        'day',
        expect.any(Function) // dailyAggregator函数
      );
    });
  });

  describe('日志输出', () => {
    it('应该输出完整的压缩流程日志', async () => {
      const username = 'testuser';
      const recordedCurrentMonthStart = 1609459200000;
      const timeRecords = [createRecord(1609459200000, 1800)];
      
      const mockHourlyRecords = [createHourlyRecord(0, 1800)];
      const mockDailyRecords = [createRecord(1609459200000, 1800)];
      
      vi.mocked(aggregateByKey).mockReturnValue(mockHourlyRecords);
      vi.mocked(aggreateByTime).mockReturnValue(mockDailyRecords);
      
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(timeRecords)
        .mockResolvedValueOnce(recordedCurrentMonthStart)
        .mockResolvedValueOnce(null);
      
      await compressMonthTimeRecord(username);
      
      // 验证日志输出
      expect(console.log).toHaveBeenCalledWith('压缩月记录，查询结果:', timeRecords);
      expect(console.log).toHaveBeenCalledWith('压缩月记录，需要压缩的记录:', timeRecords);
      expect(console.log).toHaveBeenCalledWith('压缩月记录，需要保留的记录:', []);
      expect(console.log).toHaveBeenCalledWith('压缩月记录，压缩后的小时维度记录:', mockHourlyRecords);
      expect(console.log).toHaveBeenCalledWith('压缩月记录，压缩后的天维度记录:', mockDailyRecords);
      expect(console.log).toHaveBeenCalledWith('压缩月记录，查询年记录:', null);
    });
  });
}); 