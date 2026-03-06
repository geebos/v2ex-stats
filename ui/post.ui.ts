import { isPostBrowsingApplyToHotTopics, isPostBrowsingMarkNewPosts, isUIShowIgnoreUpdateConfig, isPostBrowsingShowNewComments } from "@/service/config";
import { getPostInfo } from "@/service/history/collect";
import { getPostStatus, ignorePost, isPostIgnored, PostStatus, recoverPost } from "@/service/history/post";
import xpath from "@/service/xpath";
import { applyLabel, applyHotLabel, clearLabel, clearHotLabel } from "@/ui/index";
import { getIsDarkMode } from "@/service/utils";

// V2EX 每页评论数量
const V2EX_COMMENT_PAGE_SIZE = 100;
const V2EX_POST_ALL_CELL_XPATH = '(//div[@id="Main"]//div[@class="box"])[1]//div[@class="cell item"]';
const V2EX_POST_SHOWN_CELL_XPATH = '(//div[@id="Main"]//div[@class="box"])[1]/div[@class="cell item"]';
const V2EX_POST_IGNORED_CELL_XPATH = '(//div[@id="Main"]//div[@class="box"])[1]/div[@class="v-stats-removed-posts"]/div[@class="cell item"]';

// 今日热议主题
const V2EX_HOT_TOPICS_BOX_ID = 'TopicsHot';
const V2EX_HOT_TOPICS_SHOWN_CELL_XPATH = `//div[@id="${V2EX_HOT_TOPICS_BOX_ID}"]/div[contains(@class, "cell") and contains(@class, "hot_t_")]`;
const V2EX_HOT_TOPICS_IGNORED_CELL_XPATH = `//div[@id="${V2EX_HOT_TOPICS_BOX_ID}"]/div[@class="v-stats-removed-posts"]/div[contains(@class, "cell") and contains(@class, "hot_t_")]`;

// ======================== 插件环境检测 ========================

// 检测页面插件环境
const detectPlugins = () => {
  // 检测是否是 V2EX Polish
  const isVP = Array.from(document.body.classList).some(className => className.includes('v2p'))
  return { isVP }
}

// ======================== 链接修改相关 ========================

// 根据帖子状态修改跳转链接，直接跳到最新评论页
const tryModifyHrefPage = (anchor: HTMLAnchorElement, postStatus: PostStatus) => {
  const { viewedCount } = postStatus;

  // 如果没有查看记录则跳过
  if (!viewedCount) return;

  // 如果评论数不超过一页则无需修改
  if (viewedCount <= V2EX_COMMENT_PAGE_SIZE) return;

  // 最新评论需要翻页，修改跳转链接直接跳到最新评论所在页
  const page = Math.ceil(viewedCount / V2EX_COMMENT_PAGE_SIZE);

  // 构建带页码的 URL
  const url = new URL(anchor.href);
  url.searchParams.set('p', page.toString());
  console.log('修改跳转链接', anchor.href, '到', url.toString());

  // 更新回复数链接
  anchor.href = url.toString();
  // 同时更新标题链接
  const titleAnchor = xpath.findNode<HTMLAnchorElement>('../../td[3]//a', anchor);
  if (titleAnchor) {
    titleAnchor.href = url.toString();
  }
}

// ======================== 帖子处理相关 ========================

// 移除帖子元素
const removePostCell = (postId: string) => {
  if (!postId) {
    console.log('removePostCell: 帖子ID不存在');
    return;
  }

  const cells = xpath.findNodes<HTMLDivElement>(`//div[contains(@class, 'cell item') and .//a[contains(@href, '/t/${postId}')]]`, document.body);
  if (cells.length === 0) {
    console.log('removePostCell: 帖子元素不存在', postId);
    return;
  }

  cells.forEach(cell => cell.remove());
}

const appendPostCell = (postId: string) => {
  if (!postId) {
    console.log('appendPostCell: 帖子ID不存在');
    return;
  }

  const cells = xpath.findNodes<HTMLDivElement>(`//div[contains(@class, 'cell item') and .//a[contains(@href, '/t/${postId}')]]`, document.body);
  if (cells.length === 0) {
    console.log('appendPostCell: 帖子元素不存在', postId);
    return;
  }
  const cell = cells[0];

  const box = xpath.findNode<HTMLDivElement>(`./ancestor::div[contains(@class, 'box')]`, cell);
  if (!box) {
    console.log('appendPostCell: box 元素不存在', postId);
    return;
  }

  const ignoreToggle = xpath.findNode<HTMLDivElement>('.//div[@class="v-stats-toggle-bar"]', box);
  if (!ignoreToggle) {
    console.log('appendPostCell: toggle 元素不存在', postId);
    return;
  }

  box.insertBefore(cell, ignoreToggle);
}

// 从今日热议容器中移除指定帖子 cell（仅从 #TopicsHot 内查找）
const removeHotTopicCell = (postId: string) => {
  if (!postId) return;
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;
  const cells = xpath.findNodes<HTMLDivElement>(`.//div[contains(@class, 'cell') and contains(@class, 'hot_t_') and .//a[contains(@href, '/t/${postId}')]]`, box);
  cells.forEach(cell => cell.remove());
};

// 将已恢复的帖子 cell 重新插入今日热议的展示区域（从隐藏容器移回）
const appendHotTopicCell = (postId: string) => {
  if (!postId) return;
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;
  const hiddenContainer = box.querySelector('.v-stats-removed-posts');
  if (!hiddenContainer) return;
  const cell = xpath.findNode<HTMLDivElement>(`.//div[contains(@class, 'cell') and contains(@class, 'hot_t_') and .//a[contains(@href, '/t/${postId}')]]`, hiddenContainer as Element);
  if (!cell) return;
  const toggleBar = box.querySelector('.v-stats-toggle-bar');
  if (toggleBar) {
    box.insertBefore(cell, toggleBar);
  } else {
    hiddenContainer.parentElement?.insertBefore(cell, hiddenContainer);
  }
}

// 从今日热议 cell 或链接解析 postId（class 含 hot_t_123 或 href /t/123）
function getHotTopicPostId(cellOrAnchor: Element): string {
  const anchor = cellOrAnchor.tagName === 'A' ? (cellOrAnchor as HTMLAnchorElement) : cellOrAnchor.querySelector?.('a[href*="/t/"]');
  const href = anchor?.getAttribute?.('href') ?? (cellOrAnchor as HTMLAnchorElement).href ?? xpath.findString('.//a[contains(@href, "/t/")]/@href', cellOrAnchor);
  if (href) {
    const m = /\/t\/(\d+)/.exec(href);
    if (m) return m[1];
  }
  const withClass = (cellOrAnchor as Element).closest?.('[class*="hot_t_"]') ?? cellOrAnchor;
  const cls = withClass?.getAttribute?.('class') ?? '';
  const hotMatch = /hot_t_(\d+)/.exec(cls);
  return hotMatch ? hotMatch[1] : '';
}

// 处理单个帖子的回复数标签和跳转链接
const processPostAnchor = async (username: string, anchor: HTMLAnchorElement) => {
  // 从链接URL中解析帖子ID和当前回复数
  const { postId, replyCount } = getPostInfo(anchor.href, document);
  // 获取用户历史访问时的帖子状态
  const postStatus = await getPostStatus(username, postId);
  if (!postStatus) {
    // 未访问过的帖子，增加未读标签
    if (await isPostBrowsingMarkNewPosts()) {
      applyLabel(anchor, 'new', '#fa8c16');
    }
    return;
  }

  if (!await isPostBrowsingShowNewComments()) {
    console.log('processPostAnchor: 帖子标签未启用，跳过');
    return;
  }
  // 比较当前回复数与历史回复数
  if (replyCount > postStatus.replyCount) {
    // 有新回复：显示增量标签
    const newCount = replyCount - postStatus.replyCount;
    applyLabel(anchor, `+${newCount}`);
  } else {
    // 没有新回复：清除标签样式
    clearLabel(anchor);
  }

  // 尝试修改跳转链接到最新评论页
  tryModifyHrefPage(anchor, postStatus);
}

// ======================== 帖子标签更新 ========================

// 更新主页帖子列表中的新回复数标签
export const updatePostsLable = async (username: string) => {
  // 获取主页帖子列表中的回复数链接元素
  const aList = xpath.findNodes<HTMLAnchorElement>(`${V2EX_POST_ALL_CELL_XPATH}//td[4]/a`, document.body);
  console.log('updatePostsLable: 帖子标签', aList);

  if (aList.length === 0) {
    console.log('updatePostsLable: 帖子标签不存在');
    return;
  }

  // 遍历每个帖子链接，检查是否有新回复
  aList.forEach(async (a) => {
    const anchor = a as HTMLAnchorElement;
    await processPostAnchor(username, anchor);
  });
}

// ======================== 忽略功能 ========================

export const removeIgnoredPosts = async (username: string) => {
  if (!await isUIShowIgnoreUpdateConfig()) {
    console.log('removeIgnoredPosts: 帖子忽略按钮未启用，跳过');
    return;
  }

  // 获取页面中所有帖子元素
  const postItems = xpath.findNodes<HTMLDivElement>(`${V2EX_POST_SHOWN_CELL_XPATH}`, document.body);
  const ignoredPosts: HTMLDivElement[] = [];

  // 遍历帖子，找出需要忽略的帖子
  for (const postItem of postItems) {
    const postURL = xpath.findString('.//a[contains(@href, "/t/")]/@href', postItem);
    if (!postURL) continue;

    const { postId } = getPostInfo(postURL, document);
    if (await isPostIgnored(username, postId)) {
      ignoredPosts.push(postItem);
    }
  }

  if (ignoredPosts.length === 0) return;

  const parent = ignoredPosts[0].parentElement;
  if (!parent) return;

  // 创建隐藏容器并移入被忽略的帖子
  const hiddenContainer = document.createElement('div');
  hiddenContainer.classList.add('v-stats-removed-posts');
  hiddenContainer.style.display = 'none';
  ignoredPosts.forEach(post => hiddenContainer.appendChild(post));

  // 创建切换按钮
  const toggleButton = await createToggleButton(ignoredPosts.length, hiddenContainer);

  // 插入到页面合适位置
  const insertPosition = xpath.findNode<Element>('(./div[@class="inner"])[last()]', parent);
  if (insertPosition) {
    parent.insertBefore(toggleButton, insertPosition);
    parent.insertBefore(hiddenContainer, insertPosition);
  } else {
    parent.appendChild(toggleButton);
    parent.appendChild(hiddenContainer);
  }
}

// 创建切换显示/隐藏按钮
const createToggleButton = async (count: number, container: HTMLElement) => {
  const toggleButton = document.createElement('div');
  toggleButton.classList.add('v-stats-toggle-bar');

  // 适配暗色模式
  const isDark = await getIsDarkMode();
  if (isDark) {
    toggleButton.style.backgroundColor = 'transparent';
    toggleButton.style.color = 'inherit';
  }

  // 设置切换逻辑
  const updateButtonText = (isHidden: boolean) => {
    toggleButton.innerText = isHidden
      ? `已忽略 ${count} 条帖子, 点击显示`
      : `已展示忽略的 ${count} 条帖子，点击隐藏`;
  };

  updateButtonText(true);
  toggleButton.onclick = () => {
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    updateButtonText(!isHidden);
  };

  return toggleButton;
};

// ======================== 今日热议：忽略与折叠 ========================

export const removeIgnoredPostsHot = async (username: string) => {
  // 功能开关检测
  const isApplyToHot = await isPostBrowsingApplyToHotTopics();
  const isShowIgnore = await isUIShowIgnoreUpdateConfig();
  if (!isApplyToHot || !isShowIgnore) return;

  // 定位今日热议容器
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;

  // 遍历当前可见帖子，筛选出已被用户忽略的帖子
  const shownCells = xpath.findNodes<HTMLDivElement>(V2EX_HOT_TOPICS_SHOWN_CELL_XPATH, document.body);
  const ignoredCells: HTMLDivElement[] = [];

  for (const cell of shownCells) {
    const postId = getHotTopicPostId(cell);
    if (!postId) continue;

    const isIgnored = await isPostIgnored(username, postId);
    if (isIgnored) {
      ignoredCells.push(cell);
    }
  }

  if (ignoredCells.length === 0) return;

  // 创建隐藏容器，将已忽略的帖子移入其中
  const hiddenContainer = document.createElement('div');
  hiddenContainer.classList.add('v-stats-removed-posts');
  hiddenContainer.style.display = 'none';
  ignoredCells.forEach(c => hiddenContainer.appendChild(c));

  // 创建切换按钮并插入到热议容器末尾
  const toggleButton = await createToggleButton(ignoredCells.length, hiddenContainer);
  box.appendChild(toggleButton);
  box.appendChild(hiddenContainer);
};

// 获取或创建今日热议标题 <a> 后的 inline 容器（标签与按钮共用）
const getOrCreateHotContainer = (titleSpan: Element): HTMLSpanElement => {
  // 若容器已存在则直接返回，避免重复创建
  const existing = titleSpan.querySelector<HTMLSpanElement>('.v-stats-hot-container');
  if (existing) return existing;

  // 创建新的 inline 容器
  const container = document.createElement('span');
  container.classList.add('v-stats-hot-container');

  // 将容器插入到帖子链接之后，若无链接则插入到标题最前方
  const anchor = titleSpan.querySelector('a[href*="/t/"]');
  if (anchor && anchor.nextSibling) {
    // 链接后有兄弟节点，插入到链接与下一节点之间
    titleSpan.insertBefore(container, anchor.nextSibling);
  } else if (anchor) {
    // 链接是最后一个子节点，直接追加
    titleSpan.appendChild(container);
  } else {
    // 无帖子链接，插入到标题最前方
    titleSpan.prepend(container);
  }

  return container;
};

// 全局热议回复数 Map
let hotReplyCountMap: Map<string, number> | undefined;

// 获取指定 postId 的热议回复数，未初始化或不存在时返回 undefined
const getHotReplyCount = (postId: string): number | undefined => hotReplyCountMap?.get(postId);

// 初始化热议回复数 Map，需检查 applyToHotTopics 与 showNewComments 配置
export const initHotReplyCountMap = async (): Promise<void> => {
  if (!await isPostBrowsingApplyToHotTopics()) return;
  if (!await isPostBrowsingShowNewComments()) return;
  hotReplyCountMap = await fetchHotTopicsReplyCount();
};

// 缓存热议回复数的 Promise，避免同一页面多次 fetch
let hotTopicsReplyCountCache: Promise<Map<string, number>> | null = null;

const fetchHotTopicsReplyCount = (): Promise<Map<string, number>> => {
  // 命中缓存直接返回，避免同一页面重复发起请求
  if (hotTopicsReplyCountCache) return hotTopicsReplyCountCache;

  hotTopicsReplyCountCache = (async () => {
    const url = new URL(window.location.href);
    const isHotTab = url.searchParams.get('tab') === 'hot';

    // 当前已在热议 tab 则直接使用现有文档，否则需额外请求热议页面
    let docToSearch: Document;
    if (isHotTab) {
      docToSearch = document;
    } else {
      try {
        const res = await fetch(`${url.origin}/?tab=hot`);
        const html = await res.text();
        docToSearch = new DOMParser().parseFromString(html, 'text/html');
      } catch (e) {
        console.error('fetchHotTopicsReplyCount: 获取热议页面失败', e);
        return new Map();
      }
    }

    // 定位热议区域主容器
    const mainBox = docToSearch.querySelector('#Main .box');
    if (!mainBox) return new Map();

    // 仅取前 10 条热议帖子
    const cells = Array.from(mainBox.querySelectorAll('.cell.item')).slice(0, 10);
    const map = new Map<string, number>();

    // 解析每条帖子的 postId 与当前回复数并写入 map
    for (const cell of cells) {
      const replyAnchor = cell.querySelector<HTMLAnchorElement>('td:last-child a');
      if (!replyAnchor) continue;

      const href = replyAnchor.getAttribute('href') || '';
      const postIdMatch = /\/t\/(\d+)/.exec(href);
      const replyCountMatch = /#reply(\d+)/.exec(href);

      if (!postIdMatch) continue;

      const postId = postIdMatch[1];
      let replyCount = 0;
      if (replyCountMatch) {
        replyCount = parseInt(replyCountMatch[1], 10);
      }

      map.set(postId, replyCount);
    }

    return map;
  })();

  return hotTopicsReplyCountCache;
};

// 今日热议：处理单条帖子的状态标签（新帖子 / 新回复数）
const processHotTopicAnchor = async (username: string, anchor: HTMLAnchorElement) => {
  // 解析 postId 与标题所在容器
  const postId = getHotTopicPostId(anchor);
  if (!postId) return;

  const titleSpan = anchor.closest('.item_hot_topic_title');
  if (!titleSpan) return;

  // 获取或创建标签与按钮的共用 inline 容器
  const container = getOrCreateHotContainer(titleSpan);

  // 查询该帖子的历史访问状态
  const postStatus = await getPostStatus(username, postId);

  // 从未访问过：标记为新帖
  if (!postStatus) {
    if (await isPostBrowsingMarkNewPosts()) {
      applyHotLabel(container, 'new', '#fa8c16');
    }
    return;
  }

  // 检查 showNewComments 配置，计算新回复增量并更新标签
  if (await isPostBrowsingShowNewComments()) {
    const currentReplyCount = getHotReplyCount(postId);
    if (currentReplyCount !== undefined && currentReplyCount > postStatus.replyCount) {
      const newCount = currentReplyCount - postStatus.replyCount;
      applyHotLabel(container, `+${newCount}`);
    } else {
      clearHotLabel(container);
    }
  } else {
    clearHotLabel(container);
  }

  // 更新热议列表跳转链接的 page 参数
  tryModifyHrefPage(anchor, postStatus);
};

export const updateHotTopicsLabel = async (username: string) => {
  // 功能开关检测
  if (!await isPostBrowsingApplyToHotTopics()) return;

  // 初始化热议回复数 Map
  await initHotReplyCountMap();

  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;

  // 遍历热议区域所有帖子标题链接，逐一处理状态标签
  const anchors = box.querySelectorAll<HTMLAnchorElement>('.item_hot_topic_title a[href*="/t/"]');
  for (const a of anchors) {
    await processHotTopicAnchor(username, a);
  }
};

// 初始化帖子忽略按钮
export const initPostIngoreButtons = async (username: string) => {
  if (!await isUIShowIgnoreUpdateConfig()) {
    console.log('initPostIngoreButtons: 帖子忽略按钮未启用，跳过');
    return;
  }

  // 获取主页帖子列表中的回复数链接元素
  const tdList = xpath.findNodes<Element>(`${V2EX_POST_SHOWN_CELL_XPATH}//td[4]`, document.body);
  console.log('帖子标签', tdList);

  if (tdList.length === 0) {
    return;
  }

  // 遍历每个帖子链接，检查是否有新回复或者是否被忽略
  tdList.forEach(async (td) => {
    // 创建忽略按钮
    const div = document.createElement('div');
    div.innerText = '忽略更新';
    div.classList.add('v-stats-ignore-button');

    // 获取帖子链接
    const href = xpath.findString('./ancestor::div[contains(@class, "cell item")]//a[contains(@href, "/t/")]/@href', td);
    if (!href) {
      console.log('initPostIngoreButtons: 帖子链接不存在', td);
      return;
    }

    const { postId } = getPostInfo(href, document);

    // 绑定忽略点击事件
    div.onclick = async () => {
      console.log('忽略更新', username, postId);
      await ignorePost(username, postId.toString());
      removePostCell(postId);
    }

    td.classList.add('v-stats-ignore-button-container');
    td.appendChild(div);
  });
}

// 初始化帖子恢复按钮
export const initPostRecoverButtons = async (username: string) => {
  if (!await isUIShowIgnoreUpdateConfig()) {
    console.log('initPostRecoverButtons: 帖子恢复按钮未启用，跳过');
    return;
  }

  // 获取主页帖子列表中的回复数链接元素
  const tdList = xpath.findNodes<Element>(`${V2EX_POST_IGNORED_CELL_XPATH}//td[4]`, document.body);
  console.log('帖子标签', tdList);

  if (tdList.length === 0) {
    return;
  }

  // 遍历每个帖子链接，检查是否有新回复或者是否被忽略
  tdList.forEach(async (td) => {
    // 创建恢复按钮
    const div = document.createElement('div');
    div.innerText = '恢复关注';
    div.classList.add('v-stats-recover-button');

    // 获取帖子链接
    const href = xpath.findString('./ancestor::div[contains(@class, "cell item")]//a[contains(@href, "/t/")]/@href', td);
    if (!href) {
      console.log('initPostIngoreButtons: 帖子链接不存在', td);
      return;
    }

    const { postId } = getPostInfo(href, document);

    // 绑定忽略点击事件
    div.onclick = async () => {
      console.log('恢复关注', username, postId);
      await recoverPost(username, postId.toString());
      appendPostCell(postId);
    }

    td.classList.add('v-stats-recover-button-container');
    td.appendChild(div);
  });
}

// 今日热议：为每条展示中的帖子添加 inline 忽略按钮
export const initHotTopicIgnoreButtons = async (username: string) => {
  // 功能开关检测
  if (!await isPostBrowsingApplyToHotTopics() || !await isUIShowIgnoreUpdateConfig()) return;

  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;

  // 获取当前可见的热议帖子列表
  const cells = xpath.findNodes<HTMLDivElement>(V2EX_HOT_TOPICS_SHOWN_CELL_XPATH, document.body);

  for (const cell of cells) {
    const postId = getHotTopicPostId(cell);
    if (!postId) continue;

    // 定位标题容器
    const titleSpan = cell.querySelector('.item_hot_topic_title');
    if (!titleSpan) continue;

    // 获取或创建标签与按钮的共用 inline 容器
    const container = getOrCreateHotContainer(titleSpan);

    // 避免重复添加
    if (container.querySelector('.v-stats-hot-ignore-btn')) continue;

    // 创建忽略按钮并绑定点击事件
    const btn = document.createElement('span');
    btn.innerText = '忽略';
    btn.classList.add('v-stats-hot-btn', 'v-stats-hot-ignore-btn');
    btn.onclick = async (e) => {
      e.preventDefault();
      await ignorePost(username, postId);
      removeHotTopicCell(postId);
    };

    container.appendChild(btn);
  }
};

// 今日热议：为已忽略列表中的帖子添加 inline 恢复按钮
export const initHotTopicRecoverButtons = async (username: string) => {
  // 功能开关检测
  if (!await isPostBrowsingApplyToHotTopics() || !await isUIShowIgnoreUpdateConfig()) return;

  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;

  // 获取隐藏容器（存放已被忽略的帖子）
  const hidden = box.querySelector('.v-stats-removed-posts');
  if (!hidden) return;

  // 获取隐藏容器内所有已忽略帖子
  const cells = xpath.findNodes<HTMLDivElement>(`.//div[contains(@class, "cell") and contains(@class, "hot_t_")]`, hidden);

  for (const cell of cells) {
    const postId = getHotTopicPostId(cell);
    if (!postId) continue;

    // 定位标题容器
    const titleSpan = cell.querySelector('.item_hot_topic_title');
    if (!titleSpan) continue;

    // 获取或创建标签与按钮的共用 inline 容器
    const container = getOrCreateHotContainer(titleSpan);

    // 避免重复添加
    if (container.querySelector('.v-stats-hot-recover-btn')) continue;

    // 创建恢复按钮并绑定点击事件
    const btn = document.createElement('span');
    btn.innerText = '恢复';
    btn.classList.add('v-stats-hot-btn', 'v-stats-hot-recover-btn');
    btn.onclick = async (e) => {
      e.preventDefault();
      await recoverPost(username, postId);
      appendHotTopicCell(postId);
    };

    container.appendChild(btn);
  }
};

// ======================== 主处理函数 ========================

// 处理帖子列表页面UI
export const processPostUI = async (username: string) => {
  console.log('处理帖子UI');
  await removeIgnoredPosts(username);
  await updatePostsLable(username);
  if (await isPostBrowsingApplyToHotTopics()) {
    await removeIgnoredPostsHot(username);
    await updateHotTopicsLabel(username);
  }
}
