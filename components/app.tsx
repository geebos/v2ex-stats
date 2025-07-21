import { BalanceRecordQuery } from "@/types/types";
import Chart, { CrawlerProgress } from "./chart";
import { useEffect, useRef, useState } from "react";
import { sendMessage } from "webext-bridge/content-script";
import { parseBalanceMaxPage, startCrawler } from "@/service/crawler";

// 查询余额记录
async function queryBalanceRecords(query: BalanceRecordQuery) {
  return await sendMessage('queryBalanceRecords', query, 'background');
}

// V2EX 余额图表应用组件
function App(props: { username: string }) {
  const chartRef = useRef<any>(null);
  const [crawlerProgress, setCrawlerProgress] = useState<CrawlerProgress>({
    isLoading: false,
    currentPage: 0,
    totalPages: 0
  });

  // 初始化余额历史数据（首次抓取）
  const initBalanceRecords = async (maxPage: number) => {
    const startPage = await sendMessage('getLatestCrawlerPage', { username: props.username }, 'background');
    console.log('开始初始化余额历史数据, 最大页数:', maxPage, '开始页数:', startPage);

    setCrawlerProgress({ isLoading: true, currentPage: 0, totalPages: maxPage });

    await startCrawler(startPage, maxPage, props.username, async (page, records) => {
      console.log(`抓取第${page}页:`, records.length, '条记录', records);
      await sendMessage('appendBalanceRecords', { records }, 'background');
      await sendMessage('setLatestCrawlerPage', { username: props.username, page: page }, 'background');

      setCrawlerProgress({ isLoading: true, currentPage: page, totalPages: maxPage });

      await chartRef.current?.updateCharts();
      return true;
    });

    await sendMessage('setIsInited', { username: props.username, isInited: true }, 'background');
    console.log('初始化余额历史数据完成');

    setCrawlerProgress({ isLoading: false, currentPage: 0, totalPages: 0 });
  }

  // 增量抓取新的余额记录
  const initNewBalanceRecords = async (maxPage: number) => {
    // 获取最新的余额记录时间戳
    const latestRecord = await sendMessage('getLatestBalanceRecord', { username: props.username }, 'background');
    const latestTimestamp = latestRecord?.timestamp ?? 0;

    console.log('开始增量抓取, 最新时间戳:', latestTimestamp);

    await startCrawler(1, maxPage, props.username, async (page, records) => {
      // 过滤出新的记录（时间戳大于等于最新记录的时间戳） 
      const newRecords = records.filter(record => record.timestamp >= latestTimestamp);

      if (newRecords.length > 0) {
        console.log(`抓取第${page}页: 新增${newRecords.length}/${records.length}条记录`);
        await sendMessage('appendBalanceRecords', { records: newRecords }, 'background');
        // 如果新记录数量等于页面记录数量，说明这页都是新记录，继续抓取
        return newRecords.length === records.length;
      }

      // 没有新记录，停止抓取
      return false;
    });

    // 更新图表
    await chartRef.current?.updateCharts();
    console.log('增量抓取完成');
  }

  // 初始化应用，根据是否已初始化决定执行首次抓取还是增量抓取
  const initApp = async () => {
    // 解析余额记录的最大页数
    const maxPage = parseBalanceMaxPage(document);

    // 检查是否已经初始化过
    const isInited = await sendMessage('getIsInited', { username: props.username }, 'background');

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
    <Chart username={props.username} query={queryBalanceRecords} ref={chartRef} crawlerProgress={crawlerProgress} />
  </>;
}

export default App;