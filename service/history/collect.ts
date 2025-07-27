import { updatePostStatus } from "@/service/history/post";
import xpath from "@/service/xpath";

// ======================== 帖子信息解析 ========================

// 从帖子页面URL和DOM中提取帖子信息
export const getPostInfo = (pathname: string, document: Document): { postId: string, replyCount: number } => {
  // 解析URL中的帖子ID（格式: /t/123#reply456）
  const matches = /\/t\/(\d+)/.exec(pathname);
  if (!matches || !matches[1]) {
    return { postId: '', replyCount: 0 };
  }

  // 使用地址栏的回复数作为兜底值
  let replyCount = parseInt(/#reply(\d+)/.exec(pathname)?.[1] || '0', 10);

  // 从DOM中获取更准确的回复数信息
  const replyCountText = xpath.findNodes<HTMLSpanElement>('(//div[@id="Main"]//div[@class="box"][2]//div[@class="cell"][1]//span[@class="gray"]//text())[1]', document);
  
  // 优先使用页面显示的回复数
  if (replyCountText.length > 0) {
    const parsedCount = parseInt(replyCountText[0].textContent || '0', 10);
    if (!isNaN(parsedCount)) {
      replyCount = parsedCount;
      console.log('回复数文本解析结果', replyCount);
    }
  }

  return {
    postId: matches[1],
    replyCount,
  };
};

// ======================== 数据收集 ========================

// 收集当前帖子的浏览信息并更新存储
export const collectPostInfo = async (username: string): Promise<void> => {
  const href = window.location.href;
  const { postId, replyCount } = getPostInfo(href, document);
  
  // 验证帖子ID有效性
  if (!postId) {
    console.log('没有找到帖子ID', href);
    return;
  }

  // 构建帖子状态数据并保存
  const timestamp = Date.now();
  const postStatus = { postId, replyCount, timestamp };
  console.log('收集帖子信息', postStatus);
  await updatePostStatus(username, postStatus);
};