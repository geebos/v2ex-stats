import type { BalanceRecord } from '@/types/types';
import { appendBalanceRecords, getLatestBalanceRecord } from './query';
import { getIsInited, getLatestCrawlerPage, setIsInited, setLatestCrawlerPage } from '@/service/storage';

// ==================== 类型定义 ====================
export interface CrawlerHooks {
  onStart?: (maxPage: number, startPage: number) => void;
  /** 返回 false 时停止抓取 */
  onCrawl?: (page: number, maxPage: number, records: BalanceRecord[]) => void | boolean | Promise<void | boolean>;
  onFinish?: () => void;
}

// ==================== 页面解析工具 ====================
// 解析余额页面的最大页数
const parseBalanceMaxPage = (document: Document): number => {
  const input = document.querySelector('input.page_input[type="number"]') as HTMLInputElement;
  const max = input.getAttribute('max');
  return max ? parseInt(max) : 1;
};

// 解析页面中的所有余额记录
const parseBalanceRecords = (document: Document): string[][] => {
  const table = document.querySelector('table.data') as HTMLTableElement;
  if (!table) return [];
  
  const rows = table.querySelectorAll('tr');
  const data: string[][] = [];
  
  rows.forEach((tr: HTMLTableRowElement, rowIndex: number) => {
    if (rowIndex === 0) return; // 跳过表头
    
    const cells = tr.querySelectorAll('td');
    const rowData = Array.from(cells).map((td: HTMLTableCellElement) => td.textContent?.trim() || '');
    
    if (rowData.length) data.push(rowData);
  });
  
  return data;
};

// 解析单条余额记录
const parseBalanceRecord = (record: string[]): BalanceRecord => {
  const dateString = record[0];
  let timestamp = new Date(dateString).getTime();
  
  // 如果日期解析失败，尝试作为纯数字解析
  if (isNaN(timestamp)) {
    timestamp = parseInt(dateString) || 0;
  }

  return {
    timestamp,
    username: '',
    type: record[1],
    delta: parseFloat(record[2]),
    balance: parseFloat(record[3])
  };
};

// ==================== 网络请求工具 ====================
// 带重试机制的异步函数执行器
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 5000
): Promise<T> => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt > maxRetries) {
        throw new Error(`操作失败，已达到最大重试次数 ${maxRetries}，最近错误: ${lastError}`, { cause: lastError });
      }

      // 指数退避延迟
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
      console.warn(`第 ${attempt} 次重试失败，${delay}ms 后重试...`, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`意外的重试循环结束, maxRetries: ${maxRetries}, lastError: ${lastError}`);
};

// 爬取指定页面的余额记录
const crawlBalanceRecordsByPage = async (page: number, parser = new DOMParser()): Promise<string[][]> => {
  const url = `${location.origin}/balance?p=${page}`;
  const response = await fetch(url);
  const html = await response.text();
  const document = parser.parseFromString(html, 'text/html');
  
  return parseBalanceRecords(document);
};

// ==================== 爬虫主流程 ====================
// 启动爬虫，按页面顺序抓取余额记录
// 返回 true 表示抓取完成，false 表示抓取中断, 中断后重新调用 initBalanceData可以继续爬取
const startCrawler = async (
  startPage: number,
  maxPage: number, 
  username: string, 
  cb: (page: number, records: BalanceRecord[]) => Promise<boolean>
): Promise<boolean> => {
  if (!cb) return true;

  for (let page = startPage; page <= maxPage; page++) {
    // 使用重试机制抓取当前页面数据
    const rawRecords = await withRetry(() => crawlBalanceRecordsByPage(page));
    
    // 解析原始数据并添加用户名信息
    const records = rawRecords.map(parseBalanceRecord);
    records.forEach(record => { record.username = username; });
    
    // 调用回调函数处理数据，如果返回 false 则停止抓取
    if (!(await cb(page, records))) return true;
    
    // 页面间延迟，避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
};

// ==================== 高级爬虫接口 ====================
// 通过网络请求获取余额页面最大页数
const fetchBalanceMaxPage = async (): Promise<number> => {
  const response = await fetch(`${location.origin}/balance`);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return parseBalanceMaxPage(doc);
};

// 初始化余额历史数据（首次抓取全部数据）
const initBalanceRecords = async (
  username: string,
  hooks?: CrawlerHooks
): Promise<void> => {
  const maxPage = await fetchBalanceMaxPage();
  const startPage = await getLatestCrawlerPage(username);
  
  console.log('开始初始化余额历史数据, 最大页数:', maxPage, '开始页数:', startPage);
  
  hooks?.onStart?.(maxPage, startPage);

  const interrupted= await startCrawler(startPage, maxPage, username, async (page, records) => {
    console.log(`抓取第${page}页:`, records.length, '条记录', records);
    await appendBalanceRecords(records);
    await setLatestCrawlerPage(username, page);

    // onCrawl 返回 false 时停止抓取，只有 boolean的 false才返回 false
    const shouldContinue = await hooks?.onCrawl?.(page, maxPage, records);
    if (shouldContinue === false) {
      return false;
    } 
    return true;
  });

  if (!interrupted) await setIsInited(username, true);
  console.log('初始化余额历史数据完成');

  hooks?.onFinish?.();
};

// 增量抓取新的余额记录
const initNewBalanceRecords = async (
  username: string,
  currentDocument?: Document
): Promise<void> => {
  const maxPage = await fetchBalanceMaxPage();
  
  // 获取最新的余额记录时间戳
  const latestRecord = await getLatestBalanceRecord(username);
  const latestTimestamp = latestRecord?.timestamp ?? 0;

  console.log('开始增量抓取, 最新时间戳:', latestTimestamp, username);

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
  };

  // 如果提供了当前文档，先从当前页面获取第一页数据
  if (currentDocument) {
    const rawRecords = parseBalanceRecords(currentDocument);
    const records = rawRecords.map(parseBalanceRecord).map(record => ({ ...record, username }));
    if (!await processRecords(1, records)) {
      console.log('在第一页发现最新记录，停止增量抓取');
      return;
    }

    // 从第二页开始增量抓取
    console.log('从第二页开始增量抓取');
    await startCrawler(2, maxPage, username, processRecords);
  } else {
    // 从第一页开始抓取
    await startCrawler(1, maxPage, username, processRecords);
  }

  console.log('增量抓取完成');
};

// 初始化应用数据，根据是否已初始化决定执行首次抓取还是增量抓取
const initBalanceData = async (
  username: string,
  currentDocument?: Document,
  hooks?: CrawlerHooks
): Promise<void> => {
  const isInited = await getIsInited(username);

  if (!isInited) {
    // 首次初始化，抓取所有历史数据
    await initBalanceRecords(username, hooks);
  } else {
    // 已初始化，只需要增量抓取新数据
    await initNewBalanceRecords(username, currentDocument);
  }
};

// ==================== 导出 ====================
export { 
  startCrawler, 
  parseBalanceMaxPage, 
  parseBalanceRecord, 
  parseBalanceRecords, 
  withRetry,
  fetchBalanceMaxPage,
  initBalanceRecords,
  initNewBalanceRecords,
  initBalanceData
};