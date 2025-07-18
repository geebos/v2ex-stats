// ==================== 导入依赖 ====================
import { BalanceRecord, BalanceRecordQuery, Granularity } from "@/types/types";
// 按需引入 ECharts 组件
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

// 注册需要的组件
echarts.use([
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent,
  SVGRenderer
]);

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import styled from "styled-components";
import { FaGithub } from "react-icons/fa";

// ==================== 类型定义 ====================
interface LabelProps {
  name: string;
  granularity: Granularity;
  start: () => number;
  end: () => number;
}

export interface CrawlerProgress {
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
}

interface ChartProps {
  username: string;
  query: (query: BalanceRecordQuery) => Promise<BalanceRecord[]>;
  crawlerProgress: CrawlerProgress;
}

// ==================== 配置常量 ====================
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
  height: 40px;
  padding: 16px 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  position: relative;
  justify-content: space-between;
  align-items: flex-start;
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
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;

  &:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }

  &:active {
    background-color: #d1d5db;
  }
`;

const TimeLabelsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const GitHubLabel = styled(Label)`
  background-color: #f0f9ff;
  border-color: #0ea5e9;
  color: #0ea5e9;

  &:hover {
    background-color: #e0f2fe;
    border-color: #0284c7;
  }

  &:active {
    background-color: #bae6fd;
  }
`;

const ProgressOverlay = styled.div<{ progress: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(220, 252, 231, 0.9) ${props => props.progress}%,
    rgba(255, 255, 255, 0.9) ${props => props.progress}%
  );
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const ProgressText = styled.div`
  font-size: 14px;
  color: #374151;
  font-weight: 500;
`;

const Echarts = styled.div`
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
`;

// ==================== 数据转换函数 ====================
const cumulativeSum = (numbers: number[]): number[] => {
  const result = [...numbers]; // 复制输入数组
  for (let i = 0; i < result.length - 1; i++) {
    result[i + 1] = result[i] + result[i + 1];
  }
  return result;
};

const transformRecordsToChartData = (records: BalanceRecord[], value: (record: BalanceRecord) => number, granularity: Granularity) => {
  records.reverse();
  const xAxis = records.map(record => {
    const date = new Date(record.timestamp);

    // 使用 UTC 时间并根据 granularity 格式化
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
  });
  const series = records.map(record => value(record));
  return { xAxis, series };
};

const transformRecordsToPieChartSource = (records: any[]) => {
  const source = records.map(record => [
    record.type,
    Math.abs(record.delta),
    record.delta > 0 ? 'income' : 'expense'
  ]);
  return [['type', 'delta', 'kind'], ...source];
};

// ==================== 图表配置函数 ====================
const getLineChartOption = (allRecords: BalanceRecord[], incomeRecords: BalanceRecord[], expenseRecords: BalanceRecord[], granularity: Granularity) => {
  const { xAxis, series: allSeries } = transformRecordsToChartData(allRecords, (record) => record.balance, granularity);
  const { series: incomeSeries } = transformRecordsToChartData(incomeRecords, (record) => record.delta, granularity);
  const { series: expenseSeries } = transformRecordsToChartData(expenseRecords, (record) => Math.abs(record.delta), granularity);
  const cumulativeIncomeSeries = cumulativeSum(incomeSeries);
  const cumulativeExpenseSeries = cumulativeSum(expenseSeries);

  return {
    legend: {
      orient: 'horizontal',
      right: 10,
      top: 10,
      data: ['余额', '总收入', '总支出']
    },
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
    xAxis: { data: xAxis },
    yAxis: {},
    series: [{
      name: '余额',
      data: allSeries,
      type: 'line',
      smooth: true
    },
    {
      name: '总支出',
      data: cumulativeExpenseSeries,
      type: 'line',
      smooth: true
    },
    {
      name: '总收入',
      data: cumulativeIncomeSeries,
      type: 'line',
      smooth: true
    }]
  };
};

const getPieChartOption = (source: any[][]) => ({
  grid: {
    left: '0%',
    right: '0%',
    bottom: '0%',
    top: '15%',
    containLabel: true
  },
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => `${params.name}: ${params.data[1]} (${params.percent}%)`
  },
  dataset: [
    { source: source },
    {
      transform: {
        type: 'filter',
        config: { dimension: 'kind', value: 'income' }
      }
    },
    {
      transform: {
        type: 'filter',
        config: { dimension: 'kind', value: 'expense' }
      }
    }
  ],
  series: [
    {
      type: 'pie',
      radius: '50%',
      center: ['25%', '50%'],
      datasetIndex: 1
    },
    {
      type: 'pie',
      radius: '50%',
      center: ['75%', '50%'],
      datasetIndex: 2
    }
  ]
});

// ==================== 主要组件 ====================
const Chart = forwardRef((props: ChartProps, ref: React.Ref<any>) => {
  const timeChartRef = useRef<HTMLDivElement>(null);
  const typeChartRef = useRef<HTMLDivElement>(null);
  const timeChart = useRef<echarts.ECharts | null>(null);
  const typeChart = useRef<echarts.ECharts | null>(null);
  const selectedLabel = useRef<LabelProps | null>(null);

  // 初始化图表
  const initCharts = () => {
    if (!timeChartRef.current || !typeChartRef.current) return;

    timeChart.current = echarts.init(timeChartRef.current, null, {
      renderer: 'svg',
      height: '300px',
    });
    typeChart.current = echarts.init(typeChartRef.current, null, {
      renderer: 'svg',
      height: '300px',
    });
  };

  // 更新所有图表
  const updateCharts = async (params: LabelProps) => {
    if (!timeChart.current || !typeChart.current) return;

    const baseQuery = {
      username: props.username,
      granularity: params.granularity,
      start: params.start(),
      end: params.end(),
    };

    // 并行查询时间和类型数据
    const [typeRecords, allRecords, incomeRecords, expenseRecords] = await Promise.all([
      props.query({ ...baseQuery, aggType: 'agg_type', recordType: 'all' }),
      props.query({ ...baseQuery, aggType: 'agg_time', recordType: 'all' }),
      props.query({ ...baseQuery, aggType: 'agg_time', recordType: 'income' }),
      props.query({ ...baseQuery, aggType: 'agg_time', recordType: 'expense' })
    ]);
    console.log('typeRecords', typeRecords);
    console.log('allRecords', allRecords);
    console.log('incomeRecords', incomeRecords);
    console.log('expenseRecords', expenseRecords);

    timeChart.current.setOption(getLineChartOption(allRecords, incomeRecords, expenseRecords, params.granularity));
    console.log('更新时间图表', params, allRecords);

    const source = transformRecordsToPieChartSource(typeRecords);
    typeChart.current.setOption(getPieChartOption(source));
    console.log('更新类型饼图', params, typeRecords);
  };

  // 组件初始化
  useEffect(() => {
    if (!props.username) return;

    initCharts();
    updateCharts(timeLabels[0]);
  }, []);

  useImperativeHandle(ref, () => ({
    updateCharts: async () => await updateCharts(selectedLabel.current ?? timeLabels[0])
  }));

  return (
    <Container>
      <LabelRow>
        <TimeLabelsContainer>
          {timeLabels.map((label) => (
            <Label key={label.name} onClick={() => {
              selectedLabel.current = label;
              updateCharts(label);
            }}>
              {label.name}
            </Label>
          ))}
        </TimeLabelsContainer>
        <Label onClick={() => window.open('https://github.com/geebos/v2ex-stats', '_blank')}>
          <FaGithub size={16} />
        </Label>
        {props.crawlerProgress.isLoading && (
          <ProgressOverlay progress={props.crawlerProgress.currentPage / props.crawlerProgress.totalPages * 100}>
            <ProgressText>
              正在抓取数据... {props.crawlerProgress.currentPage}/{props.crawlerProgress.totalPages}
            </ProgressText>
          </ProgressOverlay>
        )}
      </LabelRow>
      <Echarts ref={timeChartRef} />
      <Echarts ref={typeChartRef} />
    </Container>
  );
})

export default Chart;