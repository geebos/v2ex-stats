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

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styled from "styled-components";
import { FaGithub, FaInfoCircle } from "react-icons/fa";
import { sendMessage } from "webext-bridge/content-script";


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
  height: 30px;
  padding: 16px 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  position: relative;
  justify-content: space-between;
  align-items: flex-start;
`;

const Label = styled.div<{ isDarkMode: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.isDarkMode ? '#adbac7' : '#d1d5db'};
  border-radius: 6px;
  background-color: ${props => props.isDarkMode ? 'transparent' : '#f9fafb'};
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: ${props => props.isDarkMode ? '#adbac7' : '#374151'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;

  &:hover {
    filter: ${props => props.isDarkMode ? 'invert(0.5)' : 'none'};
    background-color: ${props => props.isDarkMode ? 'transparent' : '#e5e7eb'};
  }

  &:active {
    background-color: #d1d5db;
  }
`;

const LabelGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  height: 100%;
`;

const InfoLabel = styled(Label)`
  position: relative;
`;

const Tooltip = styled.div<{ isDarkMode: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: ${props => props.isDarkMode ? '#adbac7' : 'white'};
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  margin-bottom: 5px;
  z-index: 1000;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.8);
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

// 格式化字节数为人类可读格式
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==================== 图表配置函数 ====================
const getIsDarkMode = () => {
  let isDarkMode = false;
  for (const c of document.body.classList) {
    if (c.toLowerCase().includes('dark')) {
      isDarkMode = true;
      break;
    }
  }
  console.log('isDarkMode', isDarkMode, [...document.body.classList]);
  return isDarkMode;
}

const adjustDarkMode = (option: echarts.EChartsCoreOption) => {
  if (!getIsDarkMode()) {
    return option;
  }
  option.backgroundColor = chartsBackgroundColor;
  option.color = chartsColors;
  return option;
}

const getLineChartOption = (allRecords: BalanceRecord[], incomeRecords: BalanceRecord[], expenseRecords: BalanceRecord[], granularity: Granularity) => {
  const { xAxis, series: allSeries } = transformRecordsToChartData(allRecords, (record) => record.balance, granularity);
  const { series: incomeSeries } = transformRecordsToChartData(incomeRecords, (record) => record.delta, granularity);
  const { series: expenseSeries } = transformRecordsToChartData(expenseRecords, (record) => Math.abs(record.delta), granularity);
  const cumulativeIncomeSeries = cumulativeSum(incomeSeries);
  const cumulativeExpenseSeries = cumulativeSum(expenseSeries);

  return adjustDarkMode({
    legend: {
      orient: 'horizontal',
      right: 10,
      top: 10,
      data: ['余额', '总收入', '总支出']
    },
    tooltip: {
      trigger: 'axis'
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
  });
};

const getPieChartOption = (source: any[][]) => {
  return adjustDarkMode({
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
};

// ==================== 主要组件 ====================
const Chart = forwardRef((props: ChartProps, ref: React.Ref<any>) => {
  const timeChartRef = useRef<HTMLDivElement>(null);
  const typeChartRef = useRef<HTMLDivElement>(null);
  const timeChart = useRef<echarts.ECharts | null>(null);
  const typeChart = useRef<echarts.ECharts | null>(null);
  const selectedLabel = useRef<LabelProps | null>(null);

  const [formattedSize, setFormattedSize] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 初始化图表
  const initCharts = () => {
    if (!timeChartRef.current || !typeChartRef.current) return;
    const theme = getIsDarkMode() ? 'dark' : null;
    setIsDarkMode(getIsDarkMode());
    console.log('图表主题', theme);

    timeChart.current = echarts.init(timeChartRef.current, theme, {
      renderer: 'svg',
      height: '300px',
    });
    typeChart.current = echarts.init(typeChartRef.current, theme, {
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

  // 获取存储容量
  const getStorageSize = async () => {
    try {
      const size = await sendMessage('getStorageSize', undefined);
      console.log('storage size', size);
      setFormattedSize(formatBytes(size)); // 格式化字节数
    } catch (error) {
      console.error('获取存储容量失败:', error);
      setFormattedSize('获取失败');
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
        <LabelGroup>
          {timeLabels.map((label) => (
            <Label key={label.name} isDarkMode={isDarkMode} onClick={() => {
              selectedLabel.current = label;
              updateCharts(label);
            }}>
              {label.name}
            </Label>
          ))}
        </LabelGroup>
        <LabelGroup>
          <InfoLabel
            isDarkMode={isDarkMode}
            onMouseEnter={() => {
              setShowTooltip(true);
              getStorageSize();
            }}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <FaInfoCircle size={16} />
            {showTooltip && formattedSize && (
              <Tooltip isDarkMode={isDarkMode}>
                缓存占用: {formattedSize}
              </Tooltip>
            )}
          </InfoLabel>
          <Label isDarkMode={isDarkMode} onClick={() => window.open('https://github.com/geebos/v2ex-stats', '_blank')}>
            <FaGithub size={16} />
          </Label>
        </LabelGroup>
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