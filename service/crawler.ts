import type { BalanceRecord } from '../types/types';

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
  const url = `/balance?p=${page}`;
  const response = await fetch(url);
  const html = await response.text();
  const document = parser.parseFromString(html, 'text/html');
  
  return parseBalanceRecords(document);
};

// ==================== 爬虫主流程 ====================
// 启动爬虫，按页面顺序抓取余额记录
const startCrawler = async (
  startPage: number,
  maxPage: number, 
  username: string, 
  cb: (page: number, records: BalanceRecord[]) => Promise<boolean>
): Promise<void> => {
  if (!cb) return;

  for (let page = startPage; page <= maxPage; page++) {
    // 使用重试机制抓取当前页面数据
    const rawRecords = await withRetry(() => crawlBalanceRecordsByPage(page));
    
    // 解析原始数据并添加用户名信息
    const records = rawRecords.map(parseBalanceRecord);
    records.forEach(record => { record.username = username; });
    
    // 调用回调函数处理数据，如果返回 false 则停止抓取
    if (!(await cb(page, records))) break;
    
    // 页面间延迟，避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

// ==================== 导出 ====================
export { startCrawler, parseBalanceMaxPage, parseBalanceRecord, parseBalanceRecords, withRetry };