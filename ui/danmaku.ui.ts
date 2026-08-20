import { getDanmakuConfig, isDanmakuEnabled } from "@/service/config";
import { getPostInfo } from "@/service/history/collect";
import {
  CommentInfo,
  countRenderedComments,
  filterDanmakuComments,
  getCurrentPage,
  getPagesToLoad,
  parseComments,
} from "@/service/comment";
import { getIsDarkMode } from "@/service/utils";
import type { ConfigOptions } from "@/types/types";

// ======================== 常量与状态 ========================

const CONTAINER_ID = 'v-stats-danmaku-container';
const STYLE_ID = 'v-stats-danmaku-style';

// 同一轨道相邻弹幕之间的随机水平间隔范围（像素）
const HORIZONTAL_GAP_MIN = 150;
const HORIZONTAL_GAP_MAX = 400;

// 初始化状态，防止 MutationObserver 多次触发导致重复初始化
let initPromise: Promise<void> | null = null;

// ======================== 初始化入口 ========================

// 初始化评论区弹幕（幂等，可重复调用）
export const initDanmaku = async (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const started = await startDanmaku();
      // 初始化失败（未开启/无评论池等）时允许下次重试
      if (!started) initPromise = null;
    } catch (error) {
      console.error('评论区弹幕初始化失败:', error);
      initPromise = null;
    }
  })();

  return initPromise;
};

// 弹幕启动流程
const startDanmaku = async (): Promise<boolean> => {
  if (!await isDanmakuEnabled()) {
    console.log('评论区弹幕未启用，跳过');
    return false;
  }

  // 已经存在弹幕容器，跳过
  if (document.getElementById(CONTAINER_ID)) return false;

  const config = await getDanmakuConfig();

  // 解析帖子信息（帖子ID与总评论数）
  const { postId, replyCount } = getPostInfo(window.location.href, document);
  if (!postId) {
    console.log('评论区弹幕: 未找到帖子ID，跳过');
    return false;
  }

  // 收集弹幕评论池：当前页已渲染评论 + 自动加载后续分页评论
  const pool = await collectDanmakuPool(postId, replyCount, config);
  if (pool.length === 0) {
    console.log('评论区弹幕: 没有符合条件的评论，跳过');
    return false;
  }

  const isDark = getIsDarkMode();
  injectDanmakuStyle(config.fontSize, isDark, config.opacity);
  const container = createContainer(config);
  startSpawning(container, pool, config);
  console.log('评论区弹幕已启动，评论数:', pool.length);
  return true;
};

// ======================== 评论池收集与自动加载 ========================

// 收集弹幕评论池：当前页已渲染评论 + 自动加载后续分页评论（直到满足目标数量或无更多评论）
const collectDanmakuPool = async (
  postId: string,
  replyCount: number,
  config: ConfigOptions['danmaku']
): Promise<CommentInfo[]> => {
  const currentPage = getCurrentPage(window.location.href);
  const currentCount = countRenderedComments(document);

  // 当前页面已渲染的评论
  const pool = filterDanmakuComments(parseComments(document, currentPage), config.maxTextLength);

  // 计算需要自动加载的后续分页
  const pagesToLoad = getPagesToLoad(currentCount, replyCount, currentPage, config.autoLoadCommentCount);
  if (pagesToLoad.length > 0) {
    console.log('评论区弹幕: 自动加载评论分页', pagesToLoad);
  }

  for (const page of pagesToLoad) {
    try {
      const fetched = await fetchCommentPage(postId, page);
      if (fetched.length === 0) {
        console.log('评论区弹幕: 分页无评论，停止加载', page);
        break;
      }
      pool.push(...filterDanmakuComments(fetched, config.maxTextLength));
    } catch (error) {
      console.error('评论区弹幕: 自动加载评论失败', page, error);
      break;
    }
  }
  return pool;
};

// 抓取指定页码的评论
const fetchCommentPage = async (postId: string, page: number): Promise<CommentInfo[]> => {
  const url = new URL(window.location.href);
  url.searchParams.set('p', page.toString());
  const response = await fetch(url.toString());
  if (!response.ok) return [];
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseComments(doc, page);
};

// ======================== 弹幕样式与容器 ========================

// 单条弹幕轨道高度（胶囊内容高度 + 上下留出的较大竖直间隔）
const getLaneHeight = (fontSize: number) => fontSize + 36;

// 注入弹幕样式
const injectDanmakuStyle = (fontSize: number, isDark: boolean, opacity: number) => {
  if (document.getElementById(STYLE_ID)) return;

  const bg = isDark ? 'rgba(22, 28, 36, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const color = isDark ? '#e8e8e8' : '#333333';
  const shadow = isDark ? '0 2px 8px rgba(0, 0, 0, 0.45)' : '0 2px 8px rgba(0, 0, 0, 0.15)';

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${CONTAINER_ID} {
      font-family: "Helvetica Neue", "Luxi Sans", "Segoe UI", "Hiragino Sans GB", "Microsoft Yahei", sans-serif;
    }
    .v-stats-danmaku-item {
      position: absolute;
      left: 100vw;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      white-space: nowrap;
      cursor: pointer;
      pointer-events: auto;
      box-sizing: border-box;
      background-color: ${bg};
      color: ${color};
      font-size: ${fontSize}px;
      line-height: 1.4;
      box-shadow: ${shadow};
      opacity: ${opacity};
      user-select: none;
    }
    .v-stats-danmaku-avatar {
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .v-stats-danmaku-thanks {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      font-weight: 600;
      color: #ff6b1a;
      animation: v-stats-danmaku-flame 0.9s ease-in-out infinite;
    }
    /* 鼠标悬停的弹幕：暂停滚动、置顶不被后续弹幕覆盖、不透明度 100%，移除悬停后恢复 */
    .v-stats-danmaku-item.v-stats-danmaku-hover,
    .v-stats-danmaku-item.v-stats-danmaku-hover .v-stats-danmaku-thanks {
      animation-play-state: paused;
    }
    .v-stats-danmaku-item.v-stats-danmaku-hover {
      z-index: 10;
      opacity: 1;
    }
    @keyframes v-stats-danmaku-move {
      from { transform: translateX(0); }
      to { transform: translateX(calc(var(--v-stats-danmaku-distance, -100vw) - 100%)); }
    }
    @keyframes v-stats-danmaku-flame {
      0%, 100% { transform: scale(1) rotate(-4deg); }
      25% { transform: scale(1.18) rotate(3deg); }
      50% { transform: scale(0.94) rotate(-2deg); }
      75% { transform: scale(1.12) rotate(4deg); }
    }
  `;
  document.head.appendChild(style);
};

// 创建弹幕容器（固定定位悬浮层，多轨道，指针事件穿透）
const createContainer = (config: ConfigOptions['danmaku']): HTMLDivElement => {
  // 底部偏移：避开 V2EX 底部停靠的回复框（#reply-box），弹幕悬浮在回复框上方
  const replyBox = document.querySelector('#reply-box');
  const bottomOffset = ((replyBox as HTMLElement | null)?.offsetHeight || 0) + 8;
  const laneHeight = getLaneHeight(config.fontSize);
  const laneCount = Math.max(2, Math.min(6, Math.floor((window.innerHeight - bottomOffset - 60) / laneHeight)));

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.cssText = `
    position: fixed;
    bottom: ${bottomOffset}px;
    left: 0;
    right: 0;
    height: ${laneCount * laneHeight}px;
    overflow: hidden;
    pointer-events: none;
    z-index: 99999;
  `;
  document.body.appendChild(container);
  return container;
};

// ======================== 弹幕发射循环 ========================

// 启动弹幕发射循环
const startSpawning = (container: HTMLElement, pool: CommentInfo[], config: ConfigOptions['danmaku']) => {
  const laneHeight = getLaneHeight(config.fontSize);
  const laneCount = Math.max(1, Math.floor(container.clientHeight / laneHeight));

  // 弹幕出现顺序：热门评论（感谢次数 > 0）优先，按感谢次数降序；普通评论随后随机
  const buildOrder = (): CommentInfo[] => {
    const hot = pool.filter(c => c.thanksCount > 0).sort((a, b) => b.thanksCount - a.thanksCount);
    const normal = pool.filter(c => c.thanksCount <= 0);
    return [...hot, ...shuffle(normal)];
  };
  let order = buildOrder();
  let orderIndex = 0;

  const nextComment = (): CommentInfo => {
    if (orderIndex >= order.length) {
      order = buildOrder();
      orderIndex = 0;
    }
    return order[orderIndex++];
  };

  // 同轨道相邻弹幕之间的水平间隔为随机值（覆盖原发射间隔配置）：
  // 下一条弹幕在上一条尾部让出该随机间隔后发射，按位置调度而非定时器，保证不重叠且间距随机
  const randomGap = new Array<number>(laneCount)
    .fill(0)
    .map(() => randomInt(HORIZONTAL_GAP_MIN, HORIZONTAL_GAP_MAX));
  // 每条轨道当前最后一条弹幕（用于计算已让出的水平距离）
  const lastItem = new Array<HTMLElement | null>(laneCount).fill(null);

  // 弹幕移动区域：从屏幕右缘（屏幕外）滑入，完全滚出屏幕左缘（尾部到 x=0）后才消失
  const enterX = window.innerWidth;
  const exitX = 0;

  const trySpawnInLane = (lane: number, startX: number) => {
    const last = lastItem[lane];
    if (last && last.isConnected) {
      // 上一条弹幕尾部与进入位置之间已让出的距离
      const gapPx = enterX - last.getBoundingClientRect().right;
      if (gapPx < randomGap[lane]) {
        // 间隔未达到，按剩余距离精确调度
        const delayMs = ((randomGap[lane] - gapPx) / config.speed) * 1000;
        setTimeout(() => trySpawnInLane(lane, enterX), delayMs);
        return;
      }
    }

    // 发射，并为下一条弹幕选取新的随机水平间隔
    lastItem[lane] = spawnItem(container, lane * laneHeight, nextComment(), config, startX, exitX);
    randomGap[lane] = randomInt(HORIZONTAL_GAP_MIN, HORIZONTAL_GAP_MAX);
    setTimeout(() => trySpawnInLane(lane, enterX), 0);
  };

  // 第一波弹幕：各轨道起始时间随机错开；仅第一波在进入位置左侧增加一个随机间隔
  // （起点随机左移 150-400px，左侧不对齐），后续弹幕统一从屏幕外（右缘）滑入
  for (let lane = 0; lane < laneCount; lane++) {
    const firstStartX = enterX - randomInt(HORIZONTAL_GAP_MIN, HORIZONTAL_GAP_MAX);
    setTimeout(() => trySpawnInLane(lane, firstStartX), Math.random() * 1500);
  }
};

// 创建并发射一条弹幕，返回创建的弹幕元素（用于计算下一条的水平间隔）
const spawnItem = (
  container: HTMLElement,
  top: number,
  comment: CommentInfo,
  config: ConfigOptions['danmaku'],
  startX: number,
  exitX: number
): HTMLElement => {
  const avatarSize = config.fontSize + 8;

  const item = document.createElement('div');
  item.className = 'v-stats-danmaku-item';
  item.style.top = `${top}px`;
  item.style.left = `${startX}px`;
  item.title = `#${comment.floor} @${comment.username}`;

  // 左边：评论用户头像
  const avatar = document.createElement('img');
  avatar.className = 'v-stats-danmaku-avatar';
  avatar.src = comment.avatar;
  avatar.alt = comment.username;
  avatar.style.width = `${avatarSize}px`;
  avatar.style.height = `${avatarSize}px`;
  item.appendChild(avatar);

  // 中间：评论内容
  const content = document.createElement('span');
  content.className = 'v-stats-danmaku-content';
  content.textContent = comment.content;
  item.appendChild(content);

  // 最右边：感谢次数（热门评论带火焰动画特效）
  if (comment.thanksCount > 0) {
    const thanks = document.createElement('span');
    thanks.className = 'v-stats-danmaku-thanks';
    thanks.textContent = `🔥 ${comment.thanksCount}`;
    item.appendChild(thanks);
  }

  // 点击弹幕跳转到对应评论
  item.addEventListener('click', () => jumpToComment(comment));

  // 悬停该弹幕：暂停滚动并置顶、全不透明，移出后恢复
  item.addEventListener('mouseenter', () => item.classList.add('v-stats-danmaku-hover'));
  item.addEventListener('mouseleave', () => item.classList.remove('v-stats-danmaku-hover'));

  container.appendChild(item);

  // 依据实测宽度计算动画时长（速度 = 像素/秒）
  // 移动距离 = 起点到帖子容器左侧（exitX）的距离 + 弹幕自身宽度；使用动画长属性而非 animation 简写，
  // 简写会隐含 animation-play-state: running，内联样式优先级高于样式表，会覆盖悬停暂停的 play-state
  const duration = (startX - exitX + item.offsetWidth) / config.speed;
  // 通过 CSS 变量控制每条弹幕的移动距离（终点 = exitX - 自身宽度）
  item.style.setProperty('--v-stats-danmaku-distance', `${-(startX - exitX)}px`);
  item.style.animationName = 'v-stats-danmaku-move';
  item.style.animationDuration = `${duration}s`;
  item.style.animationTimingFunction = 'linear';
  item.style.animationFillMode = 'forwards';
  item.addEventListener('animationend', () => item.remove(), { once: true });

  return item;
};

// ======================== 点击跳转 ========================

// 点击弹幕跳转到对应评论
const jumpToComment = (comment: CommentInfo) => {
  const target = document.getElementById(`r_${comment.id}`);
  if (target) {
    // 评论已渲染：anchor 跳转
    window.location.hash = `r_${comment.id}`;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    // 评论未渲染：跳转到评论所在页 + anchor 跳转
    const url = new URL(window.location.href);
    if (comment.page > 1) url.searchParams.set('p', comment.page.toString());
    url.hash = `r_${comment.id}`;
    window.location.href = url.toString();
  }
};

// ======================== 工具函数 ========================

// 返回 [min, max] 区间内的随机整数
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Fisher-Yates 洗牌（返回新数组）
const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
