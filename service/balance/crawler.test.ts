import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 导入需要测试的函数和类型
import { parseBalanceRecord, withRetry } from './crawler.ts';

describe('parseBalanceRecord', () => {
  it('应该正确解析标准日期格式', () => {
    const record = ['2025-07-16 08:44:28 +08:00', '充值', '100.00', '1234.56'];
    const result = parseBalanceRecord(record);
    
    expect(result.type).toBe('充值');
    expect(result.delta).toBe(100.00);
    expect(result.balance).toBe(1234.56);
    expect(result.timestamp).toBe(1752626668000);
  });

  it('应该正确解析不同的日期格式', () => {
    const record = ['2024-01-01 12:00:00 +08:00', '消费', '-50.00', '984.56'];
    const result = parseBalanceRecord(record);
    
    expect(result.type).toBe('消费');
    expect(result.delta).toBe(-50.00);
    expect(result.balance).toBe(984.56);
    
    // 验证时间戳对应正确的日期
    const expectedDate = new Date('2024-01-01 12:00:00 +08:00');
    expect(result.timestamp).toBe(expectedDate.getTime());
  });

  it('应该处理负数金额', () => {
    const record = ['2025-07-16 08:44:28 +08:00', '扣费', '-25.50', '999.06'];
    const result = parseBalanceRecord(record);
    
    expect(result.delta).toBe(-25.50);
    expect(result.balance).toBe(999.06);
  });

  it('应该处理小数点后多位的金额', () => {
    const record = ['2025-07-16 08:44:28 +08:00', '奖励', '0.123', '1000.123'];
    const result = parseBalanceRecord(record);
    
    expect(result.delta).toBeCloseTo(0.123, 3);
    expect(result.balance).toBeCloseTo(1000.123, 3);
  });

  it('应该处理纯数字时间戳（兼容性）', () => {
    const record = ['1640995200000', '转账', '200.00', '1500.00'];
    const result = parseBalanceRecord(record);
    
    expect(result.timestamp).toBe(1640995200000);
    expect(result.type).toBe('转账');
    expect(result.delta).toBe(200.00);
    expect(result.balance).toBe(1500.00);
  });

  it('应该处理无效日期格式并回退到数字解析', () => {
    const record = ['invalid-date', '测试', '0.00', '1000.00'];
    const result = parseBalanceRecord(record);
    
    expect(result.timestamp).toBe(0);
    expect(result.type).toBe('测试');
    expect(result.delta).toBe(0.00);
    expect(result.balance).toBe(1000.00);
  });

  it('应该处理空字符串', () => {
    const record = ['', '', '', ''];
    const result = parseBalanceRecord(record);
    
    expect(result.timestamp).toBe(0);
    expect(result.type).toBe('');
    expect(result.delta).toBeNaN();
    expect(result.balance).toBeNaN();
  });

  it('应该处理不完整的记录数组', () => {
    const record = ['2025-07-16 08:44:28 +08:00', '充值'];
    const result = parseBalanceRecord(record);
    
    expect(result.timestamp).toBeTypeOf('number');
    expect(result.type).toBe('充值');
    expect(result.delta).toBeNaN();
    expect(result.balance).toBeNaN();
  });

  it('应该正确处理不同时区的日期', () => {
    const record1 = ['2025-07-16 08:44:28 +08:00', '充值', '100.00', '1000.00'];
    const record2 = ['2025-07-16 08:44:28 +00:00', '充值', '100.00', '1000.00'];
    
    const result1 = parseBalanceRecord(record1);
    const result2 = parseBalanceRecord(record2);
    
    // 不同时区的相同UTC时间应该产生不同的时间戳
    expect(result1.timestamp).not.toBe(result2.timestamp);
    expect(Math.abs(result1.timestamp - result2.timestamp)).toBe(8 * 60 * 60 * 1000); // 8小时差
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('应该在第一次尝试成功时直接返回结果', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('应该在重试后成功返回结果', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('第一次失败'))
      .mockRejectedValueOnce(new Error('第二次失败'))
      .mockResolvedValue('第三次成功');
    
    const promise = withRetry(mockFn);
    
    // 快速执行所有定时器
    await vi.runAllTimersAsync();
    
    const result = await promise;
    
    expect(result).toBe('第三次成功');
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('应该在达到最大重试次数后抛出错误', async () => {
    const originalError = new Error('持续失败');
    const mockFn = vi.fn().mockRejectedValue(originalError);
    
    // 快速执行所有定时器
    vi.runAllTimersAsync();
    
    await expect(withRetry(mockFn, 2)).rejects.toThrow('操作失败，已达到最大重试次数 2');
    
    expect(mockFn).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('应该使用指数退避延迟', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('失败1'))
      .mockRejectedValueOnce(new Error('失败2'))
      .mockResolvedValue('成功');
    
    const promise = withRetry(mockFn, 3, 100, 1000); // initialDelay=100ms, maxDelay=1000ms
    
    // 检查第一次重试延迟 (100ms)
    await vi.advanceTimersByTimeAsync(99);
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    await vi.advanceTimersByTimeAsync(1);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // 检查第二次重试延迟 (200ms)
    await vi.advanceTimersByTimeAsync(199);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    await vi.advanceTimersByTimeAsync(1);
    
    const result = await promise;
    expect(result).toBe('成功');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('应该限制最大延迟时间', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('失败1'))
      .mockRejectedValueOnce(new Error('失败2'))
      .mockRejectedValueOnce(new Error('失败3'))
      .mockResolvedValue('成功');
    
    const promise = withRetry(mockFn, 4, 1000, 1500); // maxDelay=1500ms
    
    // 第一次重试: 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // 第二次重试: min(2000, 1500) = 1500ms
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    // 第三次重试: min(4000, 1500) = 1500ms
    await vi.advanceTimersByTimeAsync(1500);
    
    const result = await promise;
    expect(result).toBe('成功');
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('应该记录正确的重试日志', async () => {
    const error1 = new Error('第一次失败');
    const error2 = new Error('第二次失败');
    const mockFn = vi.fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2)
      .mockResolvedValue('成功');
    
    const promise = withRetry(mockFn, 3, 100);
    await vi.runAllTimersAsync();
    await promise;
    
    expect(console.warn).toHaveBeenCalledWith('第 1 次重试失败，100ms 后重试...', error1);
    expect(console.warn).toHaveBeenCalledWith('第 2 次重试失败，200ms 后重试...', error2);
  });

  it('应该支持自定义参数', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('失败'));
    
    // 快速执行所有定时器
    vi.runAllTimersAsync();
    
    await expect(withRetry(mockFn, 1, 50, 200)).rejects.toThrow('操作失败，已达到最大重试次数 1');
    expect(mockFn).toHaveBeenCalledTimes(2); // 初始调用 + 1次重试
  });

  it('应该处理异步函数返回的不同类型', async () => {
    const numberFn = vi.fn().mockResolvedValue(42);
    const objectFn = vi.fn().mockResolvedValue({ data: 'test' });
    const arrayFn = vi.fn().mockResolvedValue([1, 2, 3]);
    
    expect(await withRetry(numberFn)).toBe(42);
    expect(await withRetry(objectFn)).toEqual({ data: 'test' });
    expect(await withRetry(arrayFn)).toEqual([1, 2, 3]);
  });
}); 