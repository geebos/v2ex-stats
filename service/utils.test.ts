/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getIsDarkMode, adjustChartDarkMode, formatTimestamp } from './utils';
import * as echarts from 'echarts';

// 模拟DOM环境
beforeEach(() => {
  // 重置DOM环境
  document.body.className = '';
  document.body.innerHTML = '';
  
  // 清理所有模拟
  vi.clearAllMocks();
});

describe('getIsDarkMode', () => {
  it('应该在body包含dark类名时返回true', () => {
    document.body.classList.add('dark-theme');
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在body包含DARK类名时返回true', () => {
    document.body.classList.add('DARK-MODE');
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在V2EX原生暗色模式切换按钮为dark时返回true', () => {
    const toggleImg = document.createElement('img');
    toggleImg.setAttribute('alt', 'dark');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在V2EX原生暗色模式切换按钮为DARK时返回true', () => {
    const toggleImg = document.createElement('img');
    toggleImg.setAttribute('alt', 'DARK');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在V2EX原生暗色模式切换按钮为light时返回false', () => {
    const toggleImg = document.createElement('img');
    toggleImg.setAttribute('alt', 'light');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(false);
  });

  it('应该在没有暗色模式标识时返回false', () => {
    document.body.classList.add('light-theme');
    
    expect(getIsDarkMode()).toBe(false);
  });

  it('应该在没有切换按钮时返回false', () => {
    expect(getIsDarkMode()).toBe(false);
  });

  it('应该在切换按钮没有alt属性时返回false', () => {
    const toggleImg = document.createElement('img');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(false);
  });
});

describe('adjustChartDarkMode', () => {
  it('应该在暗色模式下添加背景色和颜色配置', () => {
    // 模拟暗色模式
    document.body.classList.add('dark');
    
    const option: echarts.EChartsCoreOption = {
      title: { text: 'Test Chart' }
    };
    
    const result = adjustChartDarkMode(option);
    
    expect(result.backgroundColor).toBe('transparent');
    expect(result.color).toEqual([
      '#dd6b66',
      '#759aa0',
      '#e69d87',
      '#8dc1a9',
      '#ea7e53',
      '#eedd78',
      '#73a373',
      '#73b9bc',
      '#7289ab',
      '#91ca8c',
      '#f49f42'
    ]);
    expect(result.title).toEqual({ text: 'Test Chart' });
  });

  it('应该在亮色模式下不修改配置', () => {
    const option: echarts.EChartsCoreOption = {
      title: { text: 'Test Chart' },
      backgroundColor: 'white'
    };
    
    const result = adjustChartDarkMode(option);
    
    expect(result).toBe(option);
    expect(result.backgroundColor).toBe('white');
    expect(result.color).toBeUndefined();
  });

  it('应该保持原有配置不变', () => {
    document.body.classList.add('dark');
    
    const option: echarts.EChartsCoreOption = {
      title: { text: 'Original Title' },
      xAxis: { type: 'category' },
      yAxis: { type: 'value' }
    };
    
    const result = adjustChartDarkMode(option);
    
    expect(result.title).toEqual({ text: 'Original Title' });
    expect(result.xAxis).toEqual({ type: 'category' });
    expect(result.yAxis).toEqual({ type: 'value' });
  });
});

describe('formatTimestamp', () => {
  // 使用固定的UTC时间进行测试
  const testTimestamp = new Date('2024-03-15T14:30:45.123Z').getTime();

  it('应该正确格式化年粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'year');
    expect(result).toBe('2024');
  });

  it('应该正确格式化月粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'month');
    expect(result).toBe('2024/03');
  });

  it('应该正确格式化日粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'day');
    expect(result).toBe('2024/03/15');
  });

  it('应该正确格式化小时粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'hour');
    expect(result).toBe('03/15 14');
  });

  it('应该在未知粒度时返回ISO字符串', () => {
    // @ts-ignore - 测试未知粒度
    const result = formatTimestamp(testTimestamp, 'unknown');
    expect(result).toBe(new Date(testTimestamp).toISOString());
  });

  it('应该正确处理月份和日期的零填充', () => {
    const timestamp = new Date('2024-01-05T08:30:45.123Z').getTime();
    
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/01');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/01/05');
    expect(formatTimestamp(timestamp, 'hour')).toBe('01/05 08');
  });

  it('应该正确处理12月的时间', () => {
    const timestamp = new Date('2024-12-25T23:30:45.123Z').getTime();
    
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/12');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/12/25');
    expect(formatTimestamp(timestamp, 'hour')).toBe('12/25 23');
  });

  it('应该正确处理年初的时间', () => {
    const timestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
    
    expect(formatTimestamp(timestamp, 'year')).toBe('2024');
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/01');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/01/01');
    expect(formatTimestamp(timestamp, 'hour')).toBe('01/01 00');
  });

  it('应该正确处理年末的时间', () => {
    const timestamp = new Date('2024-12-31T23:59:59.999Z').getTime();
    
    expect(formatTimestamp(timestamp, 'year')).toBe('2024');
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/12');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/12/31');
    expect(formatTimestamp(timestamp, 'hour')).toBe('12/31 23');
  });

  it('应该正确处理闰年2月29日', () => {
    const timestamp = new Date('2024-02-29T12:00:00.000Z').getTime();
    
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/02/29');
    expect(formatTimestamp(timestamp, 'hour')).toBe('02/29 12');
  });
}); 