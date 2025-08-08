import xpath from '@/service/xpath'
import type { FavoriteRecord } from '@/types/types'
import { parseTimeToTimestamp } from '@/service/utils'
import { getPostInfoFromUrl } from '@/service/history/collect'
import { throttle } from 'lodash'
import { storage } from '@wxt-dev/storage'

// 收藏操作类型定义
type FavoriteOperation = 'favorite' | 'unfavorite'

// 收藏列表更新间隔：30分钟
const UPDATE_INTERVAL = 1000 * 60 * 30

// 防重复初始化标志
let isListenerBound = false

// ==================== 收藏操作相关 ====================

// 执行收藏/取消收藏操作的通用函数
const performFavoriteOperation = async (postId: string, operationType: FavoriteOperation): Promise<boolean> => {
  try {
    // 获取帖子页面
    const postUrl = `/t/${postId}`
    const response = await fetch(postUrl)
    if (!response.ok) {
      console.log(`获取帖子页面失败: ${response.status}`)
      return false
    }

    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 获取收藏操作链接
    const href = xpath.findString('//a[contains(@href, "favorite")]/@href', doc)
    if (!href) {
      console.log(`未找到${operationType}链接`)
      return false
    }

    // 检查当前收藏状态是否与目标操作一致
    if (operationType === 'favorite') {
      if (href.includes('unfavorite')) {
        return true // 已收藏
      }
    } else {
      if (!href.includes('unfavorite')) {
        return true // 已取消收藏
      }
    }

    // 执行收藏操作
    const operationResponse = await fetch(href)
    if (!operationResponse.ok) {
      console.log(`${operationType}操作失败: ${operationResponse.status}`)
      return false
    }

    return true
  } catch (error) {
    console.log(`${operationType}操作出错:`, error)
    return false
  }
}

// 收藏帖子
export const favorite = async (postId: string): Promise<boolean> => {
  return performFavoriteOperation(postId, 'favorite')
}

// 取消收藏帖子
export const unfavorite = async (postId: string): Promise<boolean> => {
  return performFavoriteOperation(postId, 'unfavorite')
}

// ==================== 收藏列表获取相关 ====================

// 获取完整收藏列表（内部方法）
const _getFavoriteList = async (): Promise<FavoriteRecord[]> => {
  try {
    const allFavorites: FavoriteRecord[] = []

    // 获取第一页以确定总页数
    const firstPageResponse = await fetch('/my/topics?p=1')
    if (!firstPageResponse.ok) {
      console.log(`获取收藏列表第一页失败: ${firstPageResponse.status}`)
      return []
    }

    const firstPageHtml = await firstPageResponse.text()
    const parser = new DOMParser()
    const firstPageDoc = parser.parseFromString(firstPageHtml, 'text/html')

    // 提取总收藏数并计算页数
    const totalCountStr = xpath.findString('//a[contains(@href, "/my/topics")]/span[@class="bigger"]/text()', firstPageDoc)
    if (!totalCountStr) {
      console.log('未找到收藏主题总数')
      return []
    }

    const totalCount = parseInt(totalCountStr, 10)
    const pageSize = 20
    const totalPages = Math.ceil(totalCount / pageSize)

    // 解析第一页数据
    const firstPageFavorites = parseFavoritesFromPage(firstPageDoc)
    allFavorites.push(...firstPageFavorites)

    // 遍历其他页面
    for (let page = 2; page <= totalPages; page++) {
      await new Promise(resolve => setTimeout(resolve, 500)) // 防止请求过快
      const pageResponse = await fetch(`/my/topics?p=${page}`)
      if (!pageResponse.ok) {
        console.log(`获取收藏列表第${page}页失败: ${pageResponse.status}`)
        continue
      }

      const pageHtml = await pageResponse.text()
      const pageDoc = parser.parseFromString(pageHtml, 'text/html')
      const pageFavorites = parseFavoritesFromPage(pageDoc)
      console.log(`获取收藏列表第${page}页成功`, pageFavorites)
      allFavorites.push(...pageFavorites)
    }
    console.log('获取收藏列表完成', allFavorites)

    return allFavorites
  } catch (error) {
    console.log('获取收藏列表出错:', error)
    return []
  }
}

// 从页面解析收藏记录
const parseFavoritesFromPage = (doc: Document): FavoriteRecord[] => {
  const favorites: FavoriteRecord[] = []

  // 获取帖子容器列表
  const postContainers = xpath.findNodes('(//div[@id="Main"]//div[@class="box"])[1]//div[@class="cell item"]', doc)

  // 解析每个帖子的详细信息
  for (const container of postContainers) {
    try {
      const title = xpath.findString('.//td[3]/span[@class="item_title"]/a/text()', container)
      const postLink = xpath.findString('.//td[3]/span[@class="item_title"]/a/@href', container)
      const memberLink = xpath.findString('.//td[1]//a/@href', container)
      const avatarUrl = xpath.findString('.//td[1]//img/@src', container)
      const lastUpdatedStr = xpath.findString('.//td[3]/span[@class="topic_info"]/span[@title]/@title', container)
      const replyCountStr = xpath.findString('.//td[4]/a[@class="count_livid"]/text()', container)

      if (title && postLink && memberLink && avatarUrl && lastUpdatedStr) {
        const lastUpdated = parseTimeToTimestamp(lastUpdatedStr)
        const replyCount = replyCountStr ? parseInt(replyCountStr, 10) : 0
        const { postId } = getPostInfoFromUrl(postLink)

        favorites.push({
          title: title.trim(),
          postLink: postLink,
          memberLink: memberLink,
          postId: postId,
          avatarUrl: avatarUrl,
          lastUpdated,
          replyCount,
          viewedCount: 0,
        })
      }
    } catch (error) {
      console.log('解析单个收藏记录出错:', error)
      continue
    }
  }

  return favorites
}

// ==================== 收藏列表存储和更新相关 ====================

const getFavoriteRecords = async (username: string): Promise<Record<string, FavoriteRecord>> => {
  const recordsMap = await storage.getItem<Record<string, FavoriteRecord>>(`local:${username}:favoriteRecords`);
  return recordsMap ?? {};
}

// 从本地存储获取收藏列表
export const getFavoriteList = async (username: string): Promise<FavoriteRecord[]> => {
  const recordsMap = await getFavoriteRecords(username);
  const records = Object.values(recordsMap ?? {});
  return records.filter(record => record.viewedCount < record.replyCount).sort((a, b) => b.lastUpdated - a.lastUpdated);
}

// 更新收藏列表到本地存储
export const updateFavoriteList = async (username: string) => {
  const lastUpdateTime = await storage.getItem<number>(`local:${username}:favoriteRecordsLastUpdateTime`, { fallback: 0 });
  if (!lastUpdateTime || Date.now() - lastUpdateTime > UPDATE_INTERVAL) {
    const favoriteList = await _getFavoriteList();
    const favoriteRecords = await getFavoriteRecords(username);
    for (const record of favoriteList) {
      if (favoriteRecords[record.postId]) {
        favoriteRecords[record.postId].lastUpdated = record.lastUpdated;
        favoriteRecords[record.postId].replyCount = record.replyCount;
      } else {
        record.viewedCount = record.replyCount;
        favoriteRecords[record.postId] = record;
      }
    }
    await storage.setItem(`local:${username}:favoriteRecords`, favoriteRecords);
    await storage.setItem(`local:${username}:favoriteRecordsLastUpdateTime`, Date.now());
  }
}

// 初始化收藏列表自动更新触发器
export const initUpdateFavoriteListTrigger = async (username: string) => {
  if (isListenerBound) {
    console.log('收藏列表更新监听器已初始化，跳过');
    return;
  }

  console.log('初始化收藏列表更新监听器', username);
  isListenerBound = true;

  // 创建节流处理的事件处理器
  const eventHandler = throttle(() => {
    updateFavoriteList(username);
    console.log('触发收藏列表更新事件', username);
  }, UPDATE_INTERVAL);

  // 注册用户活动事件监听器
  const registerAllEvents = () => {
    window.addEventListener('mousemove', eventHandler);
    window.addEventListener('keydown', eventHandler);
    window.addEventListener('keyup', eventHandler);
    window.addEventListener('keypress', eventHandler);
    window.addEventListener('scroll', eventHandler);
    window.addEventListener('resize', eventHandler);
    window.addEventListener('focus', eventHandler);
  };

  // 确保在DOM加载完成后注册事件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerAllEvents();
    });
  } else {
    registerAllEvents();
  }

  console.log('初始化收藏列表更新监听器完成', username);
}