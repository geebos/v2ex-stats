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

import { storage } from '@wxt-dev/storage';
import { updateMonthTimeRecord, getTodayTotalUsedSeconds, getCurrentMonthKey } from '@/service/activity/query';
import { getMonthStartTimestamp } from '@/service/utils';

describe('updateMonthTimeRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清理控制台 mock
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock getMonthStartTimestamp 返回固定值
    vi.mocked(getMonthStartTimestamp).mockReturnValue(1609459200000); // 2021-01-01 00:00:00
  });

  // 测试数据工厂函数
  const createRecord = (
    timestamp: number,
    seconds: number
  ): UsedTimeRecord => ({
    timestamp,
    seconds
  });

  // 获取最近整点小时的工具函数
  const getNearestHour = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.getTime();
  };

  describe('首次插入记录', () => {
    it('应该在存储为 null 时创建第一条记录', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300); // 2021-01-01 00:00:30
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取 
        .mockResolvedValueOnce(null); // 数据获取
      
      await updateMonthTimeRecord(username, record);
      
      // 验证调用顺序
      expect(storage.getItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, { fallback: 0 });
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, record.timestamp);
      expect(storage.getItem).toHaveBeenNthCalledWith(2, `local:currentMonthStart:${username}`, { fallback: 0 });
      expect(storage.getItem).toHaveBeenNthCalledWith(3, getCurrentMonthKey(username));
      expect(storage.setItem).toHaveBeenNthCalledWith(2, getCurrentMonthKey(username), 
        [{ timestamp: getNearestHour(record.timestamp), seconds: 300 }]
      );
    });

    it('应该在存储为空数组时创建第一条记录', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300);
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce([]); // 数据获取（空数组）
      
      await updateMonthTimeRecord(username, record);
      
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [{ timestamp: getNearestHour(record.timestamp), seconds: 300 }]
      );
    });

    it('应该将时间戳规范化到最近的整点小时', async () => {
      const username = 'testuser';
      const record = createRecord(1609459785000, 180); // 2021-01-01 00:09:45
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(null); // 数据获取
      
      await updateMonthTimeRecord(username, record);
      
      const expectedTimestamp = getNearestHour(1609459785000); // 应该是 2021-01-01 00:00:00
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [{ timestamp: expectedTimestamp, seconds: 180 }]
      );
    });
  });

  describe('更新现有记录', () => {
    it('应该累加同一小时内的时间记录', async () => {
      const username = 'testuser';
      const baseTimestamp = 1609459200000; // 2021-01-01 00:00:00
      const newRecord = createRecord(baseTimestamp + 1800000, 300); // 00:30:00，同一小时内
      
      // Mock 现有记录
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: baseTimestamp, seconds: 600 }
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, newRecord);
      
      // 验证版本设置
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, newRecord.timestamp);
      // 验证数据更新
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [{ timestamp: baseTimestamp, seconds: 900 }] // 600 + 300 = 900
      );
    });

    it('应该在不同小时时添加新记录', async () => {
      const username = 'testuser';
      const hour1 = 1609459200000; // 2021-01-01 00:00:00
      const hour2 = 1609462800000; // 2021-01-01 01:00:00
      const newRecord = createRecord(hour2 + 1200000, 400); // 01:20:00，新的小时
      
      // Mock 现有记录
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: hour1, seconds: 600 }
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, newRecord);
      
      // 验证版本设置
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, newRecord.timestamp);
      // 验证数据更新
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [
          { timestamp: hour1, seconds: 600 },
          { timestamp: hour2, seconds: 400 }
        ]
      );
    });

    it('应该保持记录按时间戳升序排列', async () => {
      const username = 'testuser';
      const hour1 = 1609462800000; // 2021-01-01 01:00:00
      const hour2 = 1609459200000; // 2021-01-01 00:00:00 (更早)
      const hour3 = 1609466400000; // 2021-01-01 02:00:00
      const newRecord = createRecord(hour3 + 600000, 200); // 02:10:00
      
      // Mock 现有记录（未排序）
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: hour1, seconds: 300 },
        { timestamp: hour2, seconds: 150 }
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, newRecord);
      
      // 验证版本设置
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, newRecord.timestamp);
      // 验证数据更新（按时间排序）
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [
          { timestamp: hour2, seconds: 150 }, // 最早的记录
          { timestamp: hour1, seconds: 300 }, // 中间的记录
          { timestamp: hour3, seconds: 200 }  // 最新的记录
        ]
      );
    });

    it('应该在多条记录中正确更新最新的同小时记录', async () => {
      const username = 'testuser';
      const hour1 = 1609459200000; // 2021-01-01 00:00:00
      const hour2 = 1609462800000; // 2021-01-01 01:00:00
      const hour3 = 1609466400000; // 2021-01-01 02:00:00
      const newRecord = createRecord(hour3 + 900000, 250); // 02:15:00，与 hour3 同一小时
      
      // Mock 现有记录（按时间升序）
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: hour1, seconds: 100 },
        { timestamp: hour2, seconds: 200 },
        { timestamp: hour3, seconds: 300 }
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, newRecord);
      
      // 验证版本设置
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, newRecord.timestamp);
      // 验证数据更新
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [
          { timestamp: hour1, seconds: 100 },
          { timestamp: hour2, seconds: 200 },
          { timestamp: hour3, seconds: 550 } // 300 + 250 = 550
        ]
      );
    });
  });

  describe('边界情况处理', () => {
    it('应该正确处理跨天的时间记录', async () => {
      const username = 'testuser';
      const day1Hour23 = 1609545600000 - 3600000; // 2021-01-01 23:00:00
      const day2Hour00 = 1609545600000; // 2021-01-02 00:00:00
      const newRecord = createRecord(day2Hour00 + 1500000, 360); // 00:25:00
      
      // Mock 现有记录
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: day1Hour23, seconds: 480 }
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, newRecord);
      
      // 验证版本设置
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, newRecord.timestamp);
      // 验证数据更新
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [
          { timestamp: day1Hour23, seconds: 480 },
          { timestamp: day2Hour00, seconds: 360 }
        ]
      );
    });

    it('应该正确处理零秒的记录', async () => {
      const username = 'testuser';
      const record = createRecord(1609459200000, 0);
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(null); // 数据获取
      
      await updateMonthTimeRecord(username, record);
      
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [{ timestamp: getNearestHour(record.timestamp), seconds: 0 }]
      );
    });

    it('应该正确处理大数值的秒数', async () => {
      const username = 'testuser';
      const record = createRecord(1609459200000, 7200); // 2小时 = 7200秒
      
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: getNearestHour(record.timestamp), seconds: 3600 } // 1小时
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, record);
      
      // 验证版本设置
      expect(storage.setItem).toHaveBeenNthCalledWith(1, `${getCurrentMonthKey(username)}:version`, record.timestamp);
      // 验证数据更新
      expect(storage.setItem).toHaveBeenLastCalledWith(
        getCurrentMonthKey(username),
        [{ timestamp: getNearestHour(record.timestamp), seconds: 10800 }] // 3600 + 7200 = 10800
      );
    });

    it('应该在时间间隔小于最小值时跳过记录', async () => {
      const username = 'testuser';
      const record = createRecord(1609459200000, 300);
      
      // Mock版本获取，返回接近的时间戳（间隔 < 30秒）
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(1609459200000 - 10000); // 10秒前的时间戳
      
      await updateMonthTimeRecord(username, record);
      
      // 验证只调用了版本获取，没有其他操作
      expect(storage.getItem).toHaveBeenCalledTimes(1);
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('日志输出', () => {
    it('应该输出查询和更新的日志信息', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300);
      
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: getNearestHour(record.timestamp), seconds: 600 }
      ];
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(existingRecords); // 数据获取
      
      await updateMonthTimeRecord(username, record);
      
      // 验证日志调用
      expect(console.log).toHaveBeenCalledWith(`更新版本, 更新前版本 0, 更新后版本 ${record.timestamp}, 间隔 ${record.timestamp / 1000} 秒`);
      expect(console.log).toHaveBeenCalledWith('更新月记录，查询结果:', existingRecords, '新记录:', record);
      expect(console.log).toHaveBeenCalledWith('更新月记录, 更新后', [
        { timestamp: getNearestHour(record.timestamp), seconds: 900 }
      ]);
    });

    it('应该在创建首条记录时输出相应日志', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300);
      
      // Mock所有需要的storage调用
      vi.mocked(storage.getItem)
        .mockResolvedValueOnce(0) // 版本获取
        .mockResolvedValueOnce(1609459200000) // currentMonthStart获取
        .mockResolvedValueOnce(null); // 数据获取（null 表示首次创建）
      
      await updateMonthTimeRecord(username, record);
      
      // 验证日志调用
      expect(console.log).toHaveBeenCalledWith(`更新版本, 更新前版本 0, 更新后版本 ${record.timestamp}, 间隔 ${record.timestamp / 1000} 秒`);
      expect(console.log).toHaveBeenCalledWith('更新月记录，查询结果:', null, '新记录:', record);
      // 首条记录创建时的日志调用数量会多一些（因为有月份检测等逻辑）
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });
});

describe('getTodayTotalUsedSeconds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 创建今日不同时间的测试记录
  const createTodayRecord = (hour: number, seconds: number): UsedTimeRecord => {
    const today = new Date();
    const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0).getTime();
    return { timestamp, seconds };
  };

  // 创建昨日的测试记录
  const createYesterdayRecord = (hour: number, seconds: number): UsedTimeRecord => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const timestamp = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, 0, 0).getTime();
    return { timestamp, seconds };
  };

  // 创建明日的测试记录
  const createTomorrowRecord = (hour: number, seconds: number): UsedTimeRecord => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timestamp = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hour, 0, 0).getTime();
    return { timestamp, seconds };
  };

  it('应该在没有记录时返回0', async () => {
    const username = 'testuser';
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(null);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(0);
    expect(storage.getItem).toHaveBeenCalledWith(getCurrentMonthKey(username));
  });

  it('应该在空记录数组时返回0', async () => {
    const username = 'testuser';
    
    vi.mocked(storage.getItem).mockResolvedValueOnce([]);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(0);
  });

  it('应该正确累加今日所有时间记录', async () => {
    const username = 'testuser';
    
    const timeRecords: UsedTimeRecord[] = [
      createTodayRecord(9, 1800),   // 上午9点，30分钟
      createTodayRecord(14, 3600),  // 下午2点，1小时
      createTodayRecord(20, 900),   // 晚上8点，15分钟
    ];
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(timeRecords);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(6300); // 1800 + 3600 + 900 = 6300
  });

  it('应该只计算今日记录，排除昨日和明日', async () => {
    const username = 'testuser';
    
    const timeRecords: UsedTimeRecord[] = [
      createYesterdayRecord(10, 1200), // 昨日记录，应该被排除
      createTodayRecord(9, 1800),      // 今日记录
      createTodayRecord(14, 3600),     // 今日记录
      createTomorrowRecord(15, 900),   // 明日记录，应该被排除
    ];
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(timeRecords);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(5400); // 只计算今日的: 1800 + 3600 = 5400
  });

  it('应该正确处理今日边界时间', async () => {
    const username = 'testuser';
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const timeRecords: UsedTimeRecord[] = [
      { timestamp: todayStart.getTime(), seconds: 600 },      // 今日开始
      { timestamp: todayEnd.getTime(), seconds: 300 },        // 今日结束
      { timestamp: todayStart.getTime() - 1, seconds: 1200 }, // 昨日最后一秒，应该被排除
      { timestamp: todayEnd.getTime() + 1, seconds: 900 },    // 明日第一秒，应该被排除
    ];
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(timeRecords);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(900); // 只计算今日的: 600 + 300 = 900
  });

  it('应该正确处理单条今日记录', async () => {
    const username = 'testuser';
    
    const timeRecords: UsedTimeRecord[] = [
      createTodayRecord(12, 2400), // 中午12点，40分钟
    ];
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(timeRecords);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(2400);
  });

  it('应该正确处理包含零秒记录的情况', async () => {
    const username = 'testuser';
    
    const timeRecords: UsedTimeRecord[] = [
      createTodayRecord(9, 1800),  // 30分钟
      createTodayRecord(12, 0),    // 0秒
      createTodayRecord(15, 3600), // 1小时
    ];
    
    vi.mocked(storage.getItem).mockResolvedValueOnce(timeRecords);
    
    const result = await getTodayTotalUsedSeconds(username);
    
    expect(result).toBe(5400); // 1800 + 0 + 3600 = 5400
  });
}); 