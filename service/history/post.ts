import { storage } from "@wxt-dev/storage";

// ======================== 类型定义 ========================

// 帖子状态完整数据结构
export interface PostStatus {
  postId: string;
  replyCount: number;
  viewedCount?: number; // 用户已查看的评论数
  timestamp: number;
}

// 帖子状态更新数据结构（部分字段可选）
export interface UpdatePostStatus {
  postId: string;
  replyCount?: number;
  viewedCount?: number;
  timestamp?: number;
}

// ======================== 帖子状态存储操作 ========================

// 更新帖子状态信息到本地存储
export const updatePostStatus = async (username: string, updatePostStatus: UpdatePostStatus): Promise<void> => {
  // 获取用户的所有帖子状态数据
  const postStatusMap = await storage.getItem<Record<string, PostStatus>>(`local:postStatus:${username}`, { fallback: {} });
  const postStatus = postStatusMap[updatePostStatus.postId];

  let newPostStatus: PostStatus;
  
  if (postStatus) {
    // 更新已存在的帖子状态
    newPostStatus = {
      ...postStatus,
      ...updatePostStatus,
    };
  } else {
    // 创建新的帖子状态记录
    newPostStatus = {
      postId: updatePostStatus.postId,
      replyCount: updatePostStatus.replyCount || 0,
      viewedCount: updatePostStatus.viewedCount,
      timestamp: updatePostStatus.timestamp || Date.now(),
    };
  }
  
  // 更新映射表并保存到存储
  postStatusMap[updatePostStatus.postId] = newPostStatus;
  console.log('更新帖子状态', '原始记录', postStatus, '更新记录', updatePostStatus, '更新后记录', newPostStatus);
  await storage.setItem(`local:postStatus:${username}`, postStatusMap);
};

// 获取指定帖子的状态信息
export const getPostStatus = async (username: string, postId: string): Promise<PostStatus | undefined> => {
  const postStatusMap = await storage.getItem<Record<string, PostStatus>>(`local:postStatus:${username}`, { fallback: {} });
  return postStatusMap[postId];
};

// ======================== 帖子忽略功能 ========================

// 忽略指定帖子
export const ignorePost = async (username: string, postId: string): Promise<void> => {
  const ignoreMap = await storage.getItem<Record<string, boolean>>(`local:ignorePost:${username}`, { fallback: {} });
  ignoreMap[postId] = true;
  await storage.setItem(`local:ignorePost:${username}`, ignoreMap);
};

export const recoverPost = async (username: string, postId: string): Promise<void> => {
  const ignoreMap = await storage.getItem<Record<string, boolean>>(`local:ignorePost:${username}`, { fallback: {} });
  delete ignoreMap[postId];
  await storage.setItem(`local:ignorePost:${username}`, ignoreMap);
};

// 检查帖子是否被忽略
export const isPostIgnored = async (username: string, postId: string): Promise<boolean> => {
  const ignoreMap = await storage.getItem<Record<string, boolean>>(`local:ignorePost:${username}`, { fallback: {} });
  return ignoreMap[postId] || false;
};