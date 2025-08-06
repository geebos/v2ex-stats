import xpath from '@/service/xpath'
import type { FavoriteRecord } from '@/types/types'
import { parseTimeToTimestamp } from '@/service/utils'
import { getPostInfoFromUrl } from '@/service/history/collect'

type FavoriteOperation = 'favorite' | 'unfavorite'

// 执行收藏/取消收藏操作的通用函数
const performFavoriteOperation = async (postId: string, operationType: FavoriteOperation): Promise<boolean> => {
  try {
    // 1. 获取帖子页面
    const postUrl = `/t/${postId}`
    const response = await fetch(postUrl)
    if (!response.ok) {
      console.log(`获取帖子页面失败: ${response.status}`)
      return false
    }

    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 2. 使用 xpath 获取 favorite 链接
    const href = xpath.findString('//a[contains(@href, "favorite")]/@href', doc)
    if (!href) {
      console.log(`未找到${operationType}链接`)
      return false
    }
    if (operationType === 'favorite') {
      if (href.includes('unfavorite')) {
        return true
      }
    } else {
      if (!href.includes('unfavorite')) {
        return true
      }
    }


    // 3. 请求链接执行操作
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

// 获取收藏列表
export const getFavoriteList = async (): Promise<FavoriteRecord[]> => {
  try {
    const allFavorites: FavoriteRecord[] = []
    
    // 1. 获取第一页数据以确定总页数
    const firstPageResponse = await fetch('/my/topics?p=1')
    if (!firstPageResponse.ok) {
      console.log(`获取收藏列表第一页失败: ${firstPageResponse.status}`)
      return []
    }

    const firstPageHtml = await firstPageResponse.text()
    const parser = new DOMParser()
    const firstPageDoc = parser.parseFromString(firstPageHtml, 'text/html')

    // 2. 从第一页提取总收藏数
    const totalCountStr = xpath.findString('//a[contains(@href, "/my/topics")]/span[@class="bigger"]/text()', firstPageDoc)
    if (!totalCountStr) {
      console.log('未找到收藏主题总数')
      return []
    }

    const totalCount = parseInt(totalCountStr, 10)
    const pageSize = 20
    const totalPages = Math.ceil(totalCount / pageSize)

    // 3. 解析第一页数据
    const firstPageFavorites = parseFavoritesFromPage(firstPageDoc)
    allFavorites.push(...firstPageFavorites)

    // 4. 遍历其他页面
    for (let page = 2; page <= totalPages; page++) {
      await new Promise(resolve => setTimeout(resolve, 500))
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
  
  // 1. 解析帖子容器
  const postContainers = xpath.findNodes('(//div[@id="Main"]//div[@class="box"])[1]//div[@class="cell item"]', doc)
  
  // 2. 解析每个帖子的详细信息
  for (const container of postContainers) {
    try {
      const title = xpath.findString('.//td[3]/span[@class="item_title"]/a/text()', container)
      const link = xpath.findString('.//td[3]/span[@class="item_title"]/a/@href', container)
      const avatarUrl = xpath.findString('.//td[1]//img/@src', container)
      const lastUpdatedStr = xpath.findString('.//td[3]/span[@class="topic_info"]/span[@title]/@title', container)
      const replyCountStr = xpath.findString('.//td[4]/a[@class="count_livid"]/text()', container)

      if (title && link && avatarUrl && lastUpdatedStr) {
        const lastUpdated = parseTimeToTimestamp(lastUpdatedStr)
        const replyCount = replyCountStr ? parseInt(replyCountStr, 10) : 0
        const { postId } = getPostInfoFromUrl(link)

        favorites.push({
          title: title.trim(),
          link: link,
          postId: postId,
          avatarUrl: avatarUrl,
          lastUpdated,
          replyCount
        })
      }
    } catch (error) {
      console.log('解析单个收藏记录出错:', error)
      continue
    }
  }

  return favorites
}
