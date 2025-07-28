import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatTime, tryInitActivityBar } from '@/components/activity-bar';

// Mock @wxt-dev/storage 模块
vi.mock('@wxt-dev/storage', () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  }
}));

// Mock service/config 模块
vi.mock('@/service/config', () => ({
  isActivityTimeShowInStatusBar: vi.fn().mockResolvedValue(true),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  updateConfig: vi.fn(),
  resetConfig: vi.fn(),
  isCoinStatsEnabled: vi.fn(),
  isActivityTimeEnabled: vi.fn(),
  isActivityTimeShowDetailInProfile: vi.fn(),
  isPostBrowsingShowNewComments: vi.fn(),
  isPostBrowsingHighlightNewComments: vi.fn(),
  isPostBrowsingAutoScrollToFirstNewComment: vi.fn(),
  isPostBrowsingSmoothScrolling: vi.fn(),
  isPostBrowsingMarkNewPosts: vi.fn(),
}));

// Mock 依赖模块
vi.mock('@/service/activity/query', () => ({
  getTodayTotalUsedSeconds: vi.fn(),
}));

vi.mock('react', () => ({
  createElement: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(),
}));

import { getTodayTotalUsedSeconds } from '@/service/activity/query';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

describe('formatTime', () => {
  it('应该格式化小于 60 秒的时间为秒格式', () => {
    expect(formatTime(30)).toBe('30s');
    expect(formatTime(0)).toBe('0s');
    expect(formatTime(59)).toBe('59s');
  });

  it('应该格式化小于 60 分钟的时间为分钟格式', () => {
    expect(formatTime(60)).toBe('1m');
    expect(formatTime(90)).toBe('1m');
    expect(formatTime(1800)).toBe('30m');
    expect(formatTime(3540)).toBe('59m');
  });

  it('应该格式化整点小时为小时格式', () => {
    expect(formatTime(3600)).toBe('1h');
    expect(formatTime(7200)).toBe('2h');
    expect(formatTime(36000)).toBe('10h');
  });

  it('应该格式化带分钟的小时为小时分钟格式', () => {
    expect(formatTime(3660)).toBe('1h1m');
    expect(formatTime(4200)).toBe('1h10m');
    expect(formatTime(7830)).toBe('2h10m');
    expect(formatTime(9090)).toBe('2h31m');
  });

  it('应该正确处理大时间值', () => {
    expect(formatTime(86400)).toBe('24h'); // 1天
    expect(formatTime(90000)).toBe('25h'); // 25小时
    expect(formatTime(93600)).toBe('26h'); // 26小时整
    expect(formatTime(93660)).toBe('26h1m'); // 26小时1分钟
  });
});

describe('tryInitActivityBar', () => {
  let mockActivityDiv: HTMLElement;
  let mockOuterBar: HTMLElement;
  let mockInnerBar: HTMLElement;
  let mockCreateRoot: any;
  let mockRender: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock DOM 元素
    mockInnerBar = {
      style: { width: '75%' },
    } as HTMLElement;
    
    mockOuterBar = {
      querySelector: vi.fn().mockReturnValue(mockInnerBar),
    } as any;
    
    mockActivityDiv = {
      querySelector: vi.fn().mockReturnValue(mockOuterBar),
    } as any;
    
    // Mock React 相关
    mockRender = vi.fn();
    mockCreateRoot = vi.fn().mockReturnValue({ render: mockRender });
    vi.mocked(createRoot).mockImplementation(mockCreateRoot);
    vi.mocked(createElement).mockReturnValue('mock-element' as any);
    
    // Mock getTodayTotalUsedSeconds
    vi.mocked(getTodayTotalUsedSeconds).mockResolvedValue(7200); // 2小时
    
    // Mock getComputedStyle
    global.getComputedStyle = vi.fn().mockReturnValue({
      backgroundColor: 'rgb(240, 240, 240)',
    });
    
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock getElementById
    global.document = {
      getElementById: vi.fn().mockReturnValue(mockActivityDiv),
    } as any;
  });

  it('应该在找不到活动条元素时提前返回', async () => {
    global.document.getElementById = vi.fn().mockReturnValue(null);
    
    await tryInitActivityBar('testuser');
    
    expect(console.log).toHaveBeenCalledWith('没有找到活动条，不初始化');
    expect(getTodayTotalUsedSeconds).not.toHaveBeenCalled();
    expect(createRoot).not.toHaveBeenCalled();
  });

  it('应该在找不到外层进度条时提前返回', async () => {
    mockActivityDiv.querySelector = vi.fn().mockReturnValue(null);
    
    await tryInitActivityBar('testuser');
    
    expect(console.log).toHaveBeenCalledWith('没有找到外层进度条，不初始化');
    expect(getTodayTotalUsedSeconds).not.toHaveBeenCalled();
    expect(createRoot).not.toHaveBeenCalled();
  });

  it('应该在找不到内层进度条时提前返回', async () => {
    mockOuterBar.querySelector = vi.fn().mockReturnValue(null);
    
    await tryInitActivityBar('testuser');
    
    expect(console.log).toHaveBeenCalledWith('没有找到内层进度条，不初始化');
    expect(getTodayTotalUsedSeconds).not.toHaveBeenCalled();
    expect(createRoot).not.toHaveBeenCalled();
  });

  it('应该成功初始化活动条组件', async () => {
    const username = 'testuser';
    
    await tryInitActivityBar(username);
    
    // 验证 DOM 查询
    expect(document.getElementById).toHaveBeenCalledWith('member-activity');
    expect(mockActivityDiv.querySelector).toHaveBeenCalledWith('.member-activity-bar');
    expect(mockOuterBar.querySelector).toHaveBeenCalledWith('div');
    
    // 验证样式获取
    expect(getComputedStyle).toHaveBeenCalledWith(mockOuterBar);
    expect(getComputedStyle).toHaveBeenCalledWith(mockInnerBar);
    
    // 验证数据获取
    expect(getTodayTotalUsedSeconds).toHaveBeenCalledWith(username);
    
    // 验证组件渲染
    expect(createRoot).toHaveBeenCalledWith(mockActivityDiv);
    expect(createElement).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalledWith('mock-element');
    
    // 验证日志输出
    expect(console.log).toHaveBeenCalledWith('初始化活动条参数', expect.objectContaining({
      username,
      percentage: 75,
      seconds: 7200,
      color: {
        background: 'rgb(240, 240, 240)',
        progress: 'rgb(240, 240, 240)',
      }
    }));
  });

  it('应该正确解析进度条百分比', async () => {
    mockInnerBar.style.width = '45%';
    
    await tryInitActivityBar('testuser');
    
    expect(createElement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        percentage: 45,
      })
    );
  });

  it('应该正确获取不同的颜色样式', async () => {
    global.getComputedStyle = vi.fn()
      .mockReturnValueOnce({ backgroundColor: 'rgb(200, 200, 200)' }) // 外层
      .mockReturnValueOnce({ backgroundColor: 'rgb(100, 150, 200)' }); // 内层
    
    await tryInitActivityBar('testuser');
    
    expect(createElement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        color: {
          background: 'rgb(200, 200, 200)',
          progress: 'rgb(100, 150, 200)',
        }
      })
    );
  });

  it('应该处理不同的时间值', async () => {
    vi.mocked(getTodayTotalUsedSeconds).mockResolvedValue(4200); // 1h10m
    
    await tryInitActivityBar('testuser');
    
    expect(createElement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        seconds: 4200,
      })
    );
  });
}); 