import { onMessage } from "webext-bridge/background";
import { storage } from "@wxt-dev/storage";
import { aggregateBalanceRecords, appendBalanceRecords, fillTimeSeriesGaps, getAllBalanceRecords, getLatestBalanceRecord, queryBalanceRecords } from "@/service/query";

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

    /**
     * 查询指定用户的余额记录，并根据时间粒度进行聚合和插值
     * 
     * @param username - 用户名
     * @param granularity - 时间聚合粒度（minute/hour/day/month/year）
     * @param start - 查询开始时间戳
     * @param end - 查询结束时间戳
     * @returns 处理后的余额记录数组，按时间倒序排列
     */
    onMessage('queryBalanceRecords', async ({ data: { username, granularity, start, end } }) => {
      console.log(`queryBalanceRecords: username=${username}, granularity=${granularity}, start=${start}, end=${end}`);
      
      // 第一步：从存储中查询指定时间范围内的原始余额记录
      // 使用分片策略优化查询性能，只加载相关时间段的数据
      const balanceRecords = await queryBalanceRecords(username, start, end);
      
      // 第二步：按指定的时间粒度聚合记录
      // 将同一时间段内的多条记录合并为一条，使用最新记录的余额和累加的delta
      const aggregatedRecords = aggregateBalanceRecords(balanceRecords, granularity);
      
      // 第三步：填充时间序列中的空缺，生成完整的时间序列
      // 在指定的时间范围内插入缺失的时间点，保证数据的连续性
      const filledRecords = fillTimeSeriesGaps(aggregatedRecords, granularity, start, end);
      
      console.log('queryBalanceRecords', filledRecords);
      return filledRecords ?? [];
    });
  }
});
