import { onMessage } from "webext-bridge/background";
import { storage } from "@wxt-dev/storage";
import { appendBalanceRecords, getAllBalanceRecords, getLatestBalanceRecord } from "@/service/query";

// ============================================================================
// Background Script 主入口
// ============================================================================

export default defineBackground({
  main: async () => {
    console.log('Hello background!', { id: browser.runtime.id });

    // ========================================================================
    // 初始化状态管理消息处理器
    // ========================================================================

    /**
     * 获取插件初始化状态
     * @returns {boolean} 是否已初始化，默认为 false
     */
    onMessage('getIsInited', async () => {
      const isInited = await storage.getItem<boolean>('local:isInited');
      console.log('getIsInited', isInited);
      return isInited ?? false;
    });

    /**
     * 设置插件初始化状态
     * @param {Object} data - 消息数据
     * @param {boolean} data.isInited - 初始化状态
     */
    onMessage('setIsInited', async ({ data: { isInited } }) => {
      console.log('setIsInited', isInited);
      await storage.setItem('local:isInited', isInited);
    });

    // ========================================================================
    // 余额记录管理消息处理器
    // ========================================================================

    /**
     * 追加余额记录到本地存储
     * @param {Object} data - 消息数据
     * @param {BalanceRecord[]} data.records - 要追加的余额记录数组
     */
    onMessage('appendBalanceRecords', async ({ data: { records } }) => {
      console.log('appendBalanceRecords', records);
      await appendBalanceRecords(records);
    });

    /**
     * 获取指定用户的所有余额记录
     * @param {Object} data - 消息数据
     * @param {string} data.username - 用户名
     * @returns {BalanceRecord[]} 用户的所有余额记录，按时间倒序排列
     */
    onMessage('getBalanceRecords', async ({ data: { username } }) => {
      console.log('getBalanceRecords', username);
      const balanceRecords = await getAllBalanceRecords(username);
      console.log('getBalanceRecords', balanceRecords);
      return balanceRecords ?? [];
    });

    /**
     * 获取指定用户的最新余额记录
     * @param {string} username - 用户名
     * @returns {BalanceRecord | null} 最新的余额记录，如果不存在则返回 null
     */
    onMessage('getLatestBalanceRecord', async ({ data: { username } }) => {
      console.log('getLatestBalanceRecord', username);
      
      // 从存储中获取用户的最新余额记录
      const latestBalanceRecord = await getLatestBalanceRecord(username);
      console.log('getLatestBalanceRecord', latestBalanceRecord);
      
      // 确保返回值符合接口约定
      return latestBalanceRecord ?? null;
    });
  }
});
