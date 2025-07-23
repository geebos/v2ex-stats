import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UsedTimeRecord } from '@/types/types';

// Mock storage 模块
vi.mock('@wxt-dev/storage', () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  }
}));

import { storage } from '@wxt-dev/storage';
import { updateMonthTimeRecord, getTodayTotalUsedSeconds } from './query';

describe('updateMonthTimeRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清理控制台 mock
    vi.spyOn(console, 'log').mockImplementation(() => {});
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
      
      // Mock storage.getItem 返回 null
      vi.mocked(storage.getItem).mockResolvedValueOnce(null);
      
      await updateMonthTimeRecord(username, record);
      
      expect(storage.getItem).toHaveBeenCalledWith('local:monthTimeRecords:testuser');
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
        [{ timestamp: getNearestHour(record.timestamp), seconds: 300 }]
      );
    });

    it('应该在存储为空数组时创建第一条记录', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300);
      
      // Mock storage.getItem 返回空数组
      vi.mocked(storage.getItem).mockResolvedValueOnce([]);
      
      await updateMonthTimeRecord(username, record);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
        [{ timestamp: getNearestHour(record.timestamp), seconds: 300 }]
      );
    });

    it('应该将时间戳规范化到最近的整点小时', async () => {
      const username = 'testuser';
      const record = createRecord(1609459785000, 180); // 2021-01-01 00:09:45
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(null);
      
      await updateMonthTimeRecord(username, record);
      
      const expectedTimestamp = getNearestHour(1609459785000); // 应该是 2021-01-01 00:00:00
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
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
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, newRecord);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
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
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, newRecord);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
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
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, newRecord);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
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
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, newRecord);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
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
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, newRecord);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
        [
          { timestamp: day1Hour23, seconds: 480 },
          { timestamp: day2Hour00, seconds: 360 }
        ]
      );
    });

    it('应该正确处理零秒的记录', async () => {
      const username = 'testuser';
      const record = createRecord(1609459200000, 0);
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(null);
      
      await updateMonthTimeRecord(username, record);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
        [{ timestamp: getNearestHour(record.timestamp), seconds: 0 }]
      );
    });

    it('应该正确处理大数值的秒数', async () => {
      const username = 'testuser';
      const record = createRecord(1609459200000, 7200); // 2小时 = 7200秒
      
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: getNearestHour(record.timestamp), seconds: 3600 } // 1小时
      ];
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, record);
      
      expect(storage.setItem).toHaveBeenCalledWith(
        'local:monthTimeRecords:testuser',
        [{ timestamp: getNearestHour(record.timestamp), seconds: 10800 }] // 3600 + 7200 = 10800
      );
    });
  });

  describe('日志输出', () => {
    it('应该输出查询和更新的日志信息', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300);
      
      const existingRecords: UsedTimeRecord[] = [
        { timestamp: getNearestHour(record.timestamp), seconds: 600 }
      ];
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(existingRecords);
      
      await updateMonthTimeRecord(username, record);
      
      expect(console.log).toHaveBeenCalledWith('更新月记录，查询结果:', existingRecords, '新记录:', record);
      expect(console.log).toHaveBeenCalledWith('更新月记录, 更新后', [
        { timestamp: getNearestHour(record.timestamp), seconds: 900 }
      ]);
    });

    it('应该在创建首条记录时输出相应日志', async () => {
      const username = 'testuser';
      const record = createRecord(1609459230000, 300);
      
      vi.mocked(storage.getItem).mockResolvedValueOnce(null);
      
      await updateMonthTimeRecord(username, record);
      
      expect(console.log).toHaveBeenCalledWith('更新月记录，查询结果:', null, '新记录:', record);
      // 首条记录创建时不会调用第二个日志
      expect(console.log).toHaveBeenCalledTimes(1);
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
    expect(storage.getItem).toHaveBeenCalledWith('local:monthTimeRecords:testuser');
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