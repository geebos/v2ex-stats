import { onMessage } from "webext-bridge/background";
import { storage } from "@wxt-dev/storage";
import { 
  aggregateBalanceRecordsByTime, 
  aggregateBalanceRecordsByType, 
  appendBalanceRecords, 
  fillTimeSeriesGaps, 
  getAllBalanceRecords, 
  getLatestBalanceRecord, 
  queryBalanceRecords 
} from "@/service/query";
import { getStorageSize } from "@/service/storage";

// ==================== 初始化状态管理 ====================
const setupInitStateHandlers = () => {
  onMessage('getIsInited', async () => {
    const isInited = await storage.getItem<boolean>('local:isInited');
    console.log('getIsInited', isInited);
    return isInited ?? false;
  });

  onMessage('setIsInited', async ({ data: { isInited } }) => {
    console.log('setIsInited', isInited);
    await storage.setItem('local:isInited', isInited);
  });
};

// ==================== 余额记录基础操作 ====================
const setupBalanceRecordHandlers = () => {
  onMessage('appendBalanceRecords', async ({ data: { records } }) => {
    console.log('appendBalanceRecords', records);
    await appendBalanceRecords(records);
  });

  onMessage('getBalanceRecords', async ({ data: { username } }) => {
    console.log('getBalanceRecords', username);
    const balanceRecords = await getAllBalanceRecords(username);
    return balanceRecords ?? [];
  });

  onMessage('getLatestBalanceRecord', async ({ data: { username } }) => {
    console.log('getLatestBalanceRecord', username);
    const latestBalanceRecord = await getLatestBalanceRecord(username);
    return latestBalanceRecord ?? null;
  });
};

// ==================== 余额记录查询聚合 ====================
const setupBalanceQueryHandler = () => {
  onMessage('queryBalanceRecords', async ({ data: { username, granularity, aggType, recordType, start, end } }) => {
    console.log(`queryBalanceRecords: ${username}, ${granularity}, ${aggType}, ${recordType}, ${start}-${end}`);

    const balanceRecords = await queryBalanceRecords(username, recordType, start, end);

    if (aggType === 'agg_time') {
      const aggregatedRecords = aggregateBalanceRecordsByTime(balanceRecords, granularity);
      const filledRecords = fillTimeSeriesGaps(aggregatedRecords, granularity, start, end);
      console.log('queryBalanceRecords (agg_time)', filledRecords);
      return filledRecords ?? [];
    }

    if (aggType === 'agg_type') {
      const aggregatedRecords = aggregateBalanceRecordsByType(balanceRecords);
      console.log('queryBalanceRecords (agg_type)', aggregatedRecords);
      return aggregatedRecords ?? [];
    }

    console.error('queryBalanceRecords: unknown aggType', aggType);
    return [];
  });
};

// ==================== 存储容量查询 ====================
const setupStorageHandlers = () => {
  onMessage('getStorageSize', async () => {
    console.log('getStorageSize 请求');
    const formattedSize = await getStorageSize();
    return formattedSize;
  });
};

// ==================== 主入口 ====================
export default defineBackground({
  main: async () => {
    console.log('Hello background!', { id: browser.runtime.id });

    setupInitStateHandlers();
    setupBalanceRecordHandlers();
    setupBalanceQueryHandler();
    setupStorageHandlers();
  }
});
