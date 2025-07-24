// 导入依赖
import { Granularity } from "@/types/types";
import * as echarts from 'echarts';

// ==================== 域名检测 ====================

// 检测域名是否为 V2EX
export const testIsV2EX = (hostname: string) => {
  return /^(?:([a-z0-9-]+\.)*)v2ex\.com$/.test(hostname);
}

// ==================== 图表样式配置 ====================

const chartsBackgroundColor = 'transparent';
const chartsColors = [
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
]

// 检测当前页面是否为暗色模式
export const getIsDarkMode = () => {
  // 检查 V2EX Polish 扩展的暗色模式类名
  for (const c of document.body.classList) {
    if (c.toLowerCase().includes('dark')) {
      console.log('V2EX Polish dark mode');
      return true;
    }
  }

  // 检查原生 V2EX 的暗色模式切换按钮状态
  const lightToggle = document.querySelector('.light-toggle img');
  if (lightToggle) {
    console.log('V2EX original dark mode');
    return lightToggle.getAttribute('alt')?.toLowerCase() === 'dark';
  }

  // 默认返回浅色模式
  console.log('isDarkMode', false, [...document.body.classList]);
  return false;
}

// 根据暗色模式调整图表配置
export const adjustChartDarkMode = (option: echarts.EChartsCoreOption) => {
  if (!getIsDarkMode()) {
    return option;
  }
  option.backgroundColor = chartsBackgroundColor;
  option.color = chartsColors;
  return option;
}

// ==================== 时间格式化 ====================

// 根据粒度格式化时间戳为字符串
export const formatTimestamp = (timestamp: number, granularity: Granularity) => {
  const date = new Date(timestamp);
  switch (granularity) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'day':
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    case 'hour':
      return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}`;
    default:
      return date.toISOString();
  }
};

// ==================== 时间戳工具函数 ====================

// 获取月份开始时间戳（当月第一天00:00:00）
export const getMonthStartTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// 获取月份结束时间戳（当月最后一天23:59:59.999）
export const getMonthEndTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  // 设置为下个月的第1天，0点0分0秒0毫秒
  date.setMonth(date.getMonth() + 1, 1);
  date.setHours(0, 0, 0, 0);
  // 减去1毫秒，得到当前月的最后一刻
  return date.getTime() - 1;
}

// 获取小时开始时间戳（当前小时的00分00秒）
export const getHourStartTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

// 格式化字节数为人类可读格式
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}