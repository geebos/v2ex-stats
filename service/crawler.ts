import type { BalanceRecord } from '../types/types';

// 添加重试函数
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 5000
): Promise<T> {
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

      // 计算指数退避延迟时间
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
      console.warn(`第 ${attempt} 次重试失败，${delay}ms 后重试...`, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`意外的重试循环结束, maxRetries: ${maxRetries}, lastError: ${lastError}`);
}

async function startCrawler(maxPage: number, username: string, cb: (page: number, records: BalanceRecord[]) => void) {
  if (!cb) return;

  for (let page = 1; page <= maxPage; page++) {
    const rawRecords = await withRetry(() => crawlBalanceRecordsByPage(page));
    const records = rawRecords.map(parseBalanceRecord);
    records.forEach(record => {
      record.username = username;
    });
    cb(page, records);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

function parseBalanceRecord(record: string[]): BalanceRecord {
  // 解析日期格式: 2025-07-16 08:44:28 +08:00
  const dateString = record[0];
  let timestamp: number;

  // 创建 Date 对象并转换为时间戳
  const date = new Date(dateString);
  timestamp = date.getTime();

  // 如果日期解析失败（返回NaN），尝试作为纯数字解析
  if (isNaN(timestamp)) {
    timestamp = parseInt(dateString) || 0;
  }

  return {
    timestamp,
    type: record[1],
    delta: parseFloat(record[2]),
    balance: parseFloat(record[3])
  };
}

async function crawlBalanceRecordsByPage(page: number, parser = new DOMParser()): Promise<string[][]> {
  const url = `https://v2ex.com/balance?p=${page}`;
  const response = await fetch(url);
  const html = await response.text();
  const document = parser.parseFromString(html, 'text/html')
  return parseBalanceRecords(document);
}

function parseBalanceRecords(document: Document): string[][] {
  const table = document.querySelector('table.data') as HTMLTableElement;
  if (!table) return [];
  const rows = table.querySelectorAll('tr');
  const data: string[][] = [];
  rows.forEach((tr: HTMLTableRowElement, rowIndex: number) => {
    if (rowIndex === 0) return;
    const cells = tr.querySelectorAll('td');
    const rowData = Array.from(cells).map((td: HTMLTableCellElement) => td.textContent?.trim() || '');
    if (rowData.length) data.push(rowData);
  });
  return data;
}

function parseBalanceMaxPage(document: Document): number {
  const input = document.querySelector('input.page_input[type="number"]') as HTMLInputElement;
  const max = input.getAttribute('max');
  return max ? parseInt(max) : 1;
}

export { startCrawler, parseBalanceMaxPage, parseBalanceRecord, withRetry };