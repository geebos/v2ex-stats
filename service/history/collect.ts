import { updatePostStatus } from "@/service/history/post";

export const getPostInfo = (pathname: string): {postId: string, replyCount: number} => {
  const matches = /\/t\/(\d+)#reply(\d+)?/.exec(pathname);
  if (!matches) {
    return {postId: '', replyCount: 0};
  }
  return {
    postId: matches[1],
    replyCount: parseInt(matches[2] || '0', 10),
  };
};

export const collectPostInfo = async (username: string): Promise<void> => {
  const href = window.location.href;
  const {postId, replyCount} = getPostInfo(href);
  if (!postId) {
    console.log('没有找到帖子ID', href);
    return;
  }

  const timestamp = Date.now();
  const postStatus = { postId, replyCount, timestamp };
  console.log('收集帖子信息', postStatus);
  await updatePostStatus(username, postStatus);
};