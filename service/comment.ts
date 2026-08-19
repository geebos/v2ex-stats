// ======================== 类型定义 ========================

// 评论信息（用于弹幕渲染与跳转）
export interface CommentInfo {
  id: string;        // 评论 ID（r_ 前缀后的数字部分）
  floor: number;     // 楼层号
  username: string;  // 用户名
  avatar: string;    // 头像地址
  content: string;   // 评论纯文本内容
  thanksCount: number; // 感谢次数（收到谢意）
  page: number;      // 评论所在页码
}

// V2EX 每页评论数量
export const V2EX_COMMENT_PAGE_SIZE = 100;

// ======================== 通用评论识别 ========================

// 查找文档中的评论 cell（通用识别：id 以 r_ 开头的 cell）
// 兼容评论预加载插件：无论评论如何进入 DOM，只要保持通用结构即可被识别
const findCommentCells = (root: Document | Element): Element[] => {
  return Array.from(root.querySelectorAll<Element>('#Main div[id^="r_"]'));
};

// ======================== 评论解析 ========================

// 解析评论的感谢次数（收到谢意）
// V2EX 原生：❤️ 图标（img[alt="❤️"]）后的文本节点为感谢次数
// V2EX Polish：.v2p-icon-heart
export const parseThanksCount = (cell: Element): number => {
  const heart = cell.querySelector<Element>('img[alt="❤️"], .v2p-icon-heart');
  if (heart) {
    const nextText = heart.nextSibling?.textContent || '';
    const match = /(\d+)/.exec(nextText);
    if (match) return parseInt(match[1], 10);
  }

  // 兜底：匹配 "N 感谢" / "N人感谢" 形式的文本
  const text = cell.textContent || '';
  const fallbackMatch = /(\d+)\s*(?:人)?\s*感谢/.exec(text);
  return fallbackMatch ? parseInt(fallbackMatch[1], 10) : 0;
};

// 解析单个评论 cell
const parseCommentCell = (cell: Element, page: number): CommentInfo | null => {
  const id = (cell.id || '').replace(/^r_/, '');
  if (!id) return null;

  const floor = parseInt(cell.querySelector('span.no')?.textContent?.trim() || '0', 10);

  const avatarImg = cell.querySelector<HTMLImageElement>('img.avatar');
  const avatar = avatarImg?.src || '';
  const username = avatarImg?.alt
    || cell.querySelector('a[href^="/member/"]')?.textContent?.trim()
    || '';

  const contentEl = cell.querySelector('.reply_content');
  const content = (contentEl?.textContent || '').trim();

  return { id, floor, username, avatar, content, thanksCount: parseThanksCount(cell), page };
};

// 从文档/元素中解析所有评论
export const parseComments = (root: Document | Element, page: number): CommentInfo[] => {
  return findCommentCells(root)
    .map(cell => parseCommentCell(cell, page))
    .filter((comment): comment is CommentInfo => comment !== null);
};

// ======================== 弹幕筛选 ========================

// 筛选适合作为弹幕的评论（文本长度小于最大文本长度）
export const filterDanmakuComments = (comments: CommentInfo[], maxTextLength: number): CommentInfo[] => {
  return comments.filter(comment => comment.content.length < maxTextLength);
};

// ======================== 评论数量与分页 ========================

// 统计文档中已渲染的评论数量（通用评论识别，兼容预加载插件）
export const countRenderedComments = (root: Document | Element = document): number => {
  return findCommentCells(root).length;
};

// 从 URL 中解析当前评论页码（默认第 1 页）
export const getCurrentPage = (url: string): number => {
  const page = parseInt(new URL(url).searchParams.get('p') || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

// 计算需要自动加载的后续分页页码列表
// currentCount: 当前页面已渲染评论数
// replyCount: 帖子总评论数
// currentPage: 当前页码
// targetCount: 自动加载目标评论数（达到后停止加载）
export const getPagesToLoad = (
  currentCount: number,
  replyCount: number,
  currentPage: number,
  targetCount: number
): number[] => {
  if (targetCount <= 0 || currentCount >= targetCount) return [];

  const totalPages = Math.ceil(replyCount / V2EX_COMMENT_PAGE_SIZE);
  const pages: number[] = [];
  let collected = currentCount;
  let page = currentPage + 1;
  while (collected < targetCount && page <= totalPages) {
    pages.push(page);
    collected += V2EX_COMMENT_PAGE_SIZE;
    page++;
  }
  return pages;
};
