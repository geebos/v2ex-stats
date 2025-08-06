import xpath from '@/service/xpath'

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
