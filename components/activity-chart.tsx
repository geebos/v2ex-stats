// 导入依赖
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { SVGRenderer } from 'echarts/renderers';
import { createElement, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// 导入服务工具
import { adjustChartDarkMode, formatTimestamp, getIsDarkMode } from '@/service/utils';
import { getAggregatedUsedTimeRecords } from '@/service/activity/query';

// 初始化echarts组件
echarts.use([
  BarChart,
  SVGRenderer,
]);

// 图表数据结构
interface ChartData {
  xAxis: string[];
  series: number[];
}

// 图表配置生成函数
const getChartOption = (todayData: ChartData, currentMonthData: ChartData) => {
  return adjustChartDarkMode({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        let result = '';
        params.forEach((item: any) => {
          result += `${item.marker} ${item.seriesName}<br/>${item.name}: ${item.value} 分钟<br/>`;
        });
        return result;
      }
    },
    // 双图表布局配置
    grid: [
      { // 左边图
        left: 40,
        top: 20,
        bottom: 20,
        width: '40%'
      },
      { // 右边图
        right: 40,
        top: 20,
        bottom: 20,
        width: '40%'
      }
    ],
    // 双x轴配置
    xAxis: [
      { // 今天数据x轴
        type: 'category',
        gridIndex: 0,
        data: todayData.xAxis,
        axisTick: { alignWithLabel: true }
      },
      { // 本月数据x轴
        type: 'category',
        gridIndex: 1,
        data: currentMonthData.xAxis,
        axisTick: { alignWithLabel: true }
      }
    ],
    // 双y轴配置
    yAxis: [
      { // 今天数据y轴
        type: 'value',
        gridIndex: 0
      },
      { // 本月数据y轴
        type: 'value',
        gridIndex: 1
      }
    ],
    // 数据系列配置
    series: [
      {
        name: '今天在线时间',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: todayData.series
      },
      {
        name: '本月在线时间',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: currentMonthData.series
      }
    ]
  });
};

// 活动图表组件
const ActivityChartApp = (props: { username: string }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  // 初始化图表实例
  const initChart = () => {
    if (!chartRef.current) return;
    const theme = getIsDarkMode() ? 'dark' : null;
    chart.current = echarts.init(chartRef.current, theme, {
      renderer: 'svg',
      height: '150px',
    });
  };

  // 获取今天的活动数据
  const getTodayRecordsData = async () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
    const records = await getAggregatedUsedTimeRecords(props.username, 'hour', start, end);
    console.log('天维度原始数据', records);
    const xAxis = records.map(record => formatTimestamp(record.timestamp, 'hour'));
    const series = records.map(record => Math.round(record.seconds / 60));
    return { xAxis, series };
  };

  // 获取本月的活动数据
  const getCurrentMonthRecordsData = async () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0).getTime();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const records = await getAggregatedUsedTimeRecords(props.username, 'day', start, end);
    console.log('月维度原始数据', records);
    const xAxis = records.map(record => formatTimestamp(record.timestamp, 'day'));
    const series = records.map(record => Math.round(record.seconds / 60));
    return { xAxis, series };
  };

  // 更新图表数据
  const updateChart = async () => {
    if (!chart.current) return;
    const todayData = await getTodayRecordsData();
    const currentMonthData = await getCurrentMonthRecordsData();
    console.log('activity 数据，todayData', todayData, 'currentMonthData', currentMonthData);
    chart.current.setOption(getChartOption(todayData, currentMonthData));
  };

  // 组件初始化
  useEffect(() => {
    initChart();
    updateChart();
  }, []);

  return (
    <div ref={chartRef}></div>
  );
};

// 在页面中初始化活动图表
export const tryInitActivityChart = async (username: string) => {
  console.log('尝试初始化活动图表', username);
  
  // 查找容器元素
  const box = document.querySelector('#Main .box');
  if (!box) {
    console.error('未找到活动图表容器, 跳过活动图表初始化');
    return;
  }

  // 创建图表容器
  const container = document.createElement('div');
  Object.assign(container.style, {
    width: '100%',
    height: 'fit-content',
    padding: '10px 0 30px 0',
    margin: '0'
  });

  box.appendChild(container);

  // 渲染React组件
  createRoot(container).render(createElement(ActivityChartApp, { username }));

  console.log('图表初始化完成');
};