// ==================== 第三方库 ====================
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import styled from "styled-components";
import { FaGithub, FaInfoCircle } from "react-icons/fa";

// ==================== ECharts ====================
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

// ==================== 项目模块 ====================
// 类型定义
import { BalanceRecord, Granularity } from "@/types/types";

// 服务模块
import { parseBalanceMaxPage, parseBalanceRecord, parseBalanceRecords, startCrawler } from "@/service/balance/crawler";
import { alignBanlanceRecordsTimeSeries, appendBalanceRecords, getLatestBalanceRecord, queryAggBalanceRecords } from "@/service/balance/query";
import { getIsInited, getLatestCrawlerPage, getStorageSize, setIsInited, setLatestCrawlerPage } from "@/service/storage";
import { adjustChartDarkMode, formatBytes, formatTimestamp, getIsDarkMode } from "@/service/utils";
import { isCoinStatsEnabled } from "@/service/config";

// 注册 ECharts 组件
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

const Label = styled.div<{ $isDarkMode: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.$isDarkMode ? '#adbac7' : '#d1d5db'};
  border-radius: 6px;
  background-color: ${props => props.$isDarkMode ? 'transparent' : '#f9fafb'};
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: ${props => props.$isDarkMode ? '#adbac7' : '#374151'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;

  &:hover {
    filter: ${props => props.$isDarkMode ? 'invert(0.5)' : 'none'};
    background-color: ${props => props.$isDarkMode ? 'transparent' : '#e5e7eb'};
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

const Tooltip = styled.div<{ $isDarkMode: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: ${props => props.$isDarkMode ? '#adbac7' : 'white'};
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
  const xAxis = records.map(record => formatTimestamp(record.timestamp, granularity));
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

// ==================== 图表配置函数 ===================
const getLineChartOption = (allRecords: BalanceRecord[], incomeRecords: BalanceRecord[], expenseRecords: BalanceRecord[], granularity: Granularity) => {
  const { xAxis, series: allSeries } = transformRecordsToChartData(allRecords, (record) => record.balance, granularity);
  const { series: incomeSeries } = transformRecordsToChartData(incomeRecords, (record) => record.delta, granularity);
  const { series: expenseSeries } = transformRecordsToChartData(expenseRecords, (record) => Math.abs(record.delta), granularity);
  const cumulativeIncomeSeries = cumulativeSum(incomeSeries);
  const cumulativeExpenseSeries = cumulativeSum(expenseSeries);

  return adjustChartDarkMode({
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
  return adjustChartDarkMode({
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
      queryAggBalanceRecords(props.username, 'agg_type', 'all', baseQuery.start, baseQuery.end, params.granularity),
      queryAggBalanceRecords(props.username, 'agg_time', 'all', baseQuery.start, baseQuery.end, params.granularity),
      queryAggBalanceRecords(props.username, 'agg_time', 'income', baseQuery.start, baseQuery.end, params.granularity),
      queryAggBalanceRecords(props.username, 'agg_time', 'expense', baseQuery.start, baseQuery.end, params.granularity)
    ]);
    const [alignedAllRecords, alignedIncomeRecords, alignedExpenseRecords] = alignBanlanceRecordsTimeSeries([allRecords, incomeRecords, expenseRecords]);
    console.log('typeRecords', typeRecords);
    console.log('allRecords', allRecords, alignedAllRecords);
    console.log('incomeRecords', incomeRecords, alignedIncomeRecords);
    console.log('expenseRecords', expenseRecords, alignedExpenseRecords);

    timeChart.current.setOption(getLineChartOption(alignedAllRecords, alignedIncomeRecords, alignedExpenseRecords, params.granularity));
    console.log('更新时间图表', params, allRecords);

    const source = transformRecordsToPieChartSource(typeRecords);
    typeChart.current.setOption(getPieChartOption(source));
    console.log('更新类型饼图', params, typeRecords);
  };

  // 获取存储容量
  const setStorageSize = async () => {
    try {
      const size = await getStorageSize();
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
            <Label key={label.name} $isDarkMode={isDarkMode} onClick={() => {
              selectedLabel.current = label;
              updateCharts(label);
            }}>
              {label.name}
            </Label>
          ))}
        </LabelGroup>
        <LabelGroup>
          <InfoLabel
            $isDarkMode={isDarkMode}
            onMouseEnter={() => {
              setShowTooltip(true);
              setStorageSize();
            }}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <FaInfoCircle size={16} />
            {showTooltip && formattedSize && (
              <Tooltip $isDarkMode={isDarkMode}>
                缓存占用: {formattedSize}
              </Tooltip>
            )}
          </InfoLabel>
          <Label $isDarkMode={isDarkMode} onClick={() => window.open('https://github.com/geebos/v2ex-stats', '_blank')}>
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



// V2EX 余额图表应用组件
function ChartApp(props: { username: string }) {
  const chartRef = useRef<any>(null);
  const [crawlerProgress, setCrawlerProgress] = useState<CrawlerProgress>({
    isLoading: false,
    currentPage: 0,
    totalPages: 0
  });

  // 初始化余额历史数据（首次抓取）
  const initBalanceRecords = async (maxPage: number) => {
    const startPage = await getLatestCrawlerPage(props.username);
    console.log('开始初始化余额历史数据, 最大页数:', maxPage, '开始页数:', startPage);

    setCrawlerProgress({ isLoading: true, currentPage: 0, totalPages: maxPage });

    await startCrawler(startPage, maxPage, props.username, async (page, records) => {
      console.log(`抓取第${page}页:`, records.length, '条记录', records);
      await appendBalanceRecords(records);
      await setLatestCrawlerPage(props.username, page);

      setCrawlerProgress({ isLoading: true, currentPage: page, totalPages: maxPage });

      await chartRef.current?.updateCharts();
      return true;
    });

    await setIsInited(props.username, true);
    console.log('初始化余额历史数据完成');

    setCrawlerProgress({ isLoading: false, currentPage: 0, totalPages: 0 });
  }

  // 增量抓取新的余额记录
  const initNewBalanceRecords = async (maxPage: number) => {
    // 获取最新的余额记录时间戳
    const latestRecord = await getLatestBalanceRecord(props.username);
    const latestTimestamp = latestRecord?.timestamp ?? 0;

    console.log('开始增量抓取, 最新时间戳:', latestTimestamp, props.username);

    const processRecords = async (page: number, records: BalanceRecord[]): Promise<boolean> => {
      // 过滤出新的记录（时间戳大于最新记录的时间戳）
      // 可能导致同样时间戳的记录漏抓，但概率极低优先保证性能
      const newRecords = records.filter(record => record.timestamp > latestTimestamp);

      if (newRecords.length > 0) {
        console.log(`抓取第${page}页: 新增${newRecords.length}/${records.length}条记录`, newRecords);
        await appendBalanceRecords(newRecords);
        // 如果新记录数量等于页面记录数量，说明这页都是新记录，继续抓取
        return newRecords.length === records.length;
      }

      console.log('没有新记录，停止抓取 page:', page, 'records:', records);
      // 没有新记录，停止抓取
      return false;
    }

    // 第一页直接从当前页面获取
    const rawRecords = parseBalanceRecords(document);
    const records = rawRecords.map(parseBalanceRecord).map(record => ({ ...record, username: props.username }));
    if (!await processRecords(1, records)) {
      console.log('在第一页发现最新记录，停止增量抓取');
      return;
    }

    // 从第二页开始增量抓取
    console.log('从第二页开始增量抓取');
    await startCrawler(2, maxPage, props.username, processRecords);

    // 更新图表
    await chartRef.current?.updateCharts();
    console.log('增量抓取完成');
  }

  // 初始化应用，根据是否已初始化决定执行首次抓取还是增量抓取
  const initApp = async () => {
    // 解析余额记录的最大页数
    const maxPage = parseBalanceMaxPage(document);

    // 检查是否已经初始化过
    const isInited = await getIsInited(props.username);

    if (!isInited) {
      // 首次初始化，抓取所有历史数据
      await initBalanceRecords(maxPage);
    } else {
      // 已初始化，只需要增量抓取新数据
      await initNewBalanceRecords(maxPage);
    }
  }

  // 组件挂载时初始化应用
  useEffect(() => {
    initApp();
  }, []);

  return <>
    <Chart username={props.username} ref={chartRef} crawlerProgress={crawlerProgress} />
  </>;
}

// 尝试初始化余额图表
export const tryInitBalanceChart = async (username: string) => {
  if (!await isCoinStatsEnabled()) {
    console.log('余额图表未启用，跳过余额图表初始化');
    return;
  }

  console.log('尝试初始化余额图表', username);
  const anchor = document.querySelector('div.balance_area');
  if (!anchor?.parentElement) {
    console.log('没有找到定位元素');
    return;
  }

  const container = document.createElement('div');
  Object.assign(container.style, {
    width: '100%',
    height: 'fit-content',
    padding: '0',
    margin: '0'
  });

  anchor.parentElement.appendChild(container);

  createRoot(container).render(createElement(ChartApp, { username }));

  console.log('图表初始化完成');
};