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

export { getStorageSize };