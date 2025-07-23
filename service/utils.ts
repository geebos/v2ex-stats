// 导入依赖
import { Granularity } from "@/types/types";
import * as echarts from 'echarts';

// 图表样式配置
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

// 根据粒度格式化时间戳为字符串
export const formatTimestamp = (timestamp: number, granularity: Granularity) => {
  const date = new Date(timestamp);
  switch (granularity) {
    case 'year':
      return date.getUTCFullYear().toString();
    case 'month':
      return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    case 'day':
      return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`;
    case 'hour':
      return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}`;
    default:
      return date.toISOString();
  }
};