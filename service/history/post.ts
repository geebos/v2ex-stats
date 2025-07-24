import { storage } from "@wxt-dev/storage";

interface PostStatus {
  postId: string;
  replyCount: number;
  timestamp: number;
}

export const updatePostStatus = async (username: string, postStatus: PostStatus): Promise<void> => {
  const postStatusMap = await storage.getItem<Record<string, PostStatus>>(`local:postStatus:${username}`, { fallback: {} });
  postStatusMap[postStatus.postId] = postStatus
  await storage.setItem(`local:postStatus:${username}`, postStatusMap);
};

export const getPostStatus = async (username: string, postId: string): Promise<PostStatus | undefined > => {
  const postStatusMap = await storage.getItem<Record<string, PostStatus>>(`local:postStatus:${username}`, { fallback: {} });
  return postStatusMap[postId];
};
