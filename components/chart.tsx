// ==================== 导入依赖 ====================
import { BalanceRecordQuery } from "@/types/shim";
import { BalanceRecord, Granularity } from "@/types/types";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import styled from "styled-components";

// ==================== 类型定义 ====================
interface LabelProps {
  name: string;
  granularity: Granularity;
  start: () => number;
  end: () => number;
}

// ==================== 配置常量 ====================
// 时间范围选择器配置
const timeLabels: LabelProps[] = [
  { name: '全部', granularity: 'month', start: () => 0, end: () => Date.now() },
  { name: '1年', granularity: 'month', start: () => Date.now() - 1000 * 60 * 60 * 24 * 365, end: () => Date.now() },
  { name: '6月', granularity: 'day', start: () => Date.now() - 1000 * 60 * 60 * 24 * 180, end: () => Date.now() },
  { name: '3月', granularity: 'day', start: () => Date.now() - 1000 * 60 * 60 * 24 * 90, end: () => Date.now() },
  { name: '1月', granularity: 'day', start: () => Date.now() - 1000 * 60 * 60 * 24 * 30, end: () => Date.now() },
  { name: '1周', granularity: 'hour', start: () => Date.now() - 1000 * 60 * 60 * 24 * 7, end: () => Date.now() },
];

// ==================== 样式组件 ====================
const Container = styled.div`
  width: 100%;
  height: fit-content;
  padding: 0;
  margin: 0;
`;

const LabelRow = styled.div`
  width: 100%;
  height: fit-content;
  padding: 16px 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Label = styled.div`
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #374151;
  transition: all 0.2s ease;

  &:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }

  &:active {
    background-color: #d1d5db;
  }
`;

const Echarts = styled.div`
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
`;

// ==================== 工具函数 ====================
/**
 * 将余额记录转换为图表数据格式
 * @param records 余额记录数组
 * @returns 包含 xAxis 和 series 的对象
 */
const transformRecordsToChartData = (records: BalanceRecord[]) => {
  // 反转数组以按时间正序显示
  records.reverse();
  // 提取日期作为 x 轴数据
  const xAxis = records.map(record => new Date(record.timestamp).toLocaleDateString());
  // 提取余额作为 y 轴数据
  const series = records.map(record => record.balance);
  return { xAxis, series };
};

/**
 * 更新图表配置和数据
 * @param chartInstance ECharts 实例
 * @param xAxis x 轴数据（日期）
 * @param series y 轴数据（余额）
 */
const updateChart = (chartInstance: echarts.ECharts, xAxis: string[], series: number[]) => {
  chartInstance.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}'
    },
    grid: {
      left: '0%',
      right: '0%',
      bottom: '0%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      data: xAxis
    },
    yAxis: {},
    series: [
      {
        data: series,
        type: 'line',
        smooth: true
      }
    ]
  });
};

// ==================== 主要组件 ====================
/**
 * 余额图表组件
 * 显示用户余额变化趋势，支持不同时间范围查看
 */
function Chart(props: { username: string, query: (query: BalanceRecordQuery) => Promise<BalanceRecord[]> }) {
  // 图表容器引用
  const chartRef = useRef<HTMLDivElement>(null);
  // ECharts 实例引用
  const chart = useRef<echarts.ECharts | null>(null);

  // 组件初始化时加载图表
  useEffect(() => {
    const loadChart = async () => {
      // 检查容器和用户名是否存在
      if (!chartRef.current) return;
      if (!props.username) return;

      // 构建默认查询参数（显示全部数据，按月粒度）
      const query: BalanceRecordQuery = {
        username: props.username,
        granularity: 'month',
        start: 0,
        end: Date.now()
      };
      
      // 获取余额数据
      const records = await props.query(query);
      if (!records) return;
      console.log('数据初始化', records);

      // 转换数据格式
      const { xAxis, series } = transformRecordsToChartData(records);

      // 初始化 ECharts 实例
      chart.current = echarts.init(chartRef.current, null, {
        renderer: 'svg',
        height: '300px',
      });
      
      // 更新图表数据
      updateChart(chart.current, xAxis, series);
    };

    loadChart();
  }, []);

  // 处理时间标签点击事件
  const handleTimeLabelClick = async (params: LabelProps) => {
    if (!chart.current) return;
    
    // 根据选择的时间范围重新查询数据
    const records = await props.query({
      username: props.username,
      granularity: params.granularity,
      start: params.start(),
      end: params.end()
    });
    if (!records) return;
    console.log('数据更新', params, records);

    // 转换数据并更新图表
    const { xAxis, series } = transformRecordsToChartData(records);
    updateChart(chart.current, xAxis, series);
  };

  return (
    <Container>
      {/* 时间范围选择器 */}
      <LabelRow>
        {timeLabels.map((label) => (
          <Label key={label.name} onClick={() => handleTimeLabelClick(label)}>
            {label.name}
          </Label>
        ))}
      </LabelRow>
      {/* 图表容器 */}
      <Echarts ref={chartRef} />
    </Container>
  );
}

export default Chart;