import { storage } from "@wxt-dev/storage";

// 计算字符串的字节大小
function getStringByteSize(str: string): number {
  return new Blob([str]).size;
}

// 获取存储的总大小（字节数）
async function getStorageSize(): Promise<number> {
  try {
    const snapshot = await storage.snapshot("local");
    let totalBytes = 0;

    // 遍历所有 key-value 对
    for (const [key, value] of Object.entries(snapshot)) {
      // 计算 key 的字节大小
      totalBytes += getStringByteSize(key);

      // 计算 value 的字节大小
      if (value !== null && value !== undefined) {
        const valueString = JSON.stringify(value);
        totalBytes += getStringByteSize(valueString);
      }
    }

    return totalBytes;
  } catch (error) {
    console.error('获取存储大小失败:', error);
    return 0;
  }
}

const getIsInited = async (username: string) => {
  const isInited = await storage.getItem<boolean>(`local:isInited:${username}`);
  console.log('getIsInited', isInited);
  return isInited ?? false;
};

const setIsInited = async (username: string, isInited: boolean) => {
  console.log('setIsInited', isInited);
  await storage.setItem(`local:isInited:${username}`, isInited);
};

const getLatestCrawlerPage = async (username: string) => {
  const latestCrawlerPage = await storage.getItem<number>(`local:latestCrawlerPage:${username}`);
  return latestCrawlerPage ?? 1;
};

const setLatestCrawlerPage = async (username: string, page: number) => {
  await storage.setItem(`local:latestCrawlerPage:${username}`, page);
};

// 年度报告专用的初始化标记
const getAnnualReportInited = async (username: string, year: number) => {
  const isInited = await storage.getItem<boolean>(`local:annualReportInited:${year}:${username}`);
  return isInited ?? false;
};

const setAnnualReportInited = async (username: string, year: number, isInited: boolean) => {
  await storage.setItem(`local:annualReportInited:${year}:${username}`, isInited);
};

export {
  getIsInited,
  setIsInited,
  getLatestCrawlerPage,
  setLatestCrawlerPage,
  getStorageSize,
  getAnnualReportInited,
  setAnnualReportInited,
};