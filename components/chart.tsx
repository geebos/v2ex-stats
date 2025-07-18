// ==================== 导入依赖 ====================
import { BalanceRecordQuery } from "@/types/shim";
import { BalanceRecord, Granularity } from "@/types/types";
import * as echarts from "echarts";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import styled from "styled-components";

// ==================== 类型定义 ====================
interface LabelProps {
  name: string;
  granularity: Granularity;
  start: () => number;
  end: () => number;
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

// ==================== 数据转换函数 ====================
const transformRecordsToChartData = (records: BalanceRecord[], granularity: Granularity) => {
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
  const series = records.map(record => record.balance);
  return { xAxis, series };
};

const transformRecordsToPieChartSource = (records: any[]) => {
  const source = records.map(record => [
    record.type,
    Math.abs(record.delta),
    record.delta > 0 ? 'input' : 'output'
  ]);
  return [['type', 'delta', 'kind'], ...source];
};

// ==================== 图表配置函数 ====================
const getLineChartOption = (xAxis: string[], series: number[]) => ({
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
    data: series,
    type: 'line',
    smooth: true
  }]
});

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
        config: { dimension: 'kind', value: 'input' }
      }
    },
    {
      transform: {
        type: 'filter',
        config: { dimension: 'kind', value: 'output' }
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
const Chart = forwardRef((props: { username: string, query: (query: BalanceRecordQuery) => Promise<BalanceRecord[]> }, ref: React.Ref<any>) => {
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
      end: params.end()
    };

    // 并行查询时间和类型数据
    const [timeRecords, typeRecords] = await Promise.all([
      props.query({ ...baseQuery, aggType: 'agg_time' }),
      props.query({ ...baseQuery, aggType: 'agg_type' })
    ]);

    if (timeRecords) {
      const { xAxis, series } = transformRecordsToChartData(timeRecords, params.granularity);
      timeChart.current.setOption(getLineChartOption(xAxis, series));
      console.log('更新时间图表', params, timeRecords);
    }

    if (typeRecords) {
      const source = transformRecordsToPieChartSource(typeRecords);
      typeChart.current.setOption(getPieChartOption(source));
      console.log('更新类型饼图', params, typeRecords);
    }
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
        {timeLabels.map((label) => (
          <Label key={label.name} onClick={() => {
            selectedLabel.current = label;
            updateCharts(label);
          }}>
            {label.name}
          </Label>
        ))}
      </LabelRow>
      <Echarts ref={timeChartRef} />
      <Echarts ref={typeChartRef} />
    </Container>
  );
})

export default Chart;