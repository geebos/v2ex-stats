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
  const { isVP } = detectPlugins();

  // 如果没有查看记录或使用 V2EX Polish 插件则跳过
  if (!viewedCount || isVP) return;

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
  if (!await isPostBrowsingApplyToHotTopics() || !await isUIShowIgnoreUpdateConfig()) return;
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;
  const shownCells = xpath.findNodes<HTMLDivElement>(V2EX_HOT_TOPICS_SHOWN_CELL_XPATH, document.body);
  const ignoredCells: HTMLDivElement[] = [];
  for (const cell of shownCells) {
    const postId = getHotTopicPostId(cell);
    if (postId && (await isPostIgnored(username, postId))) ignoredCells.push(cell);
  }
  if (ignoredCells.length === 0) return;
  const hiddenContainer = document.createElement('div');
  hiddenContainer.classList.add('v-stats-removed-posts');
  hiddenContainer.style.display = 'none';
  ignoredCells.forEach(c => hiddenContainer.appendChild(c));
  const toggleButton = await createToggleButton(ignoredCells.length, hiddenContainer);
  box.appendChild(toggleButton);
  box.appendChild(hiddenContainer);
};

// 获取或创建今日热议标题 <a> 后的 inline 容器（标签与按钮共用）
const getOrCreateHotContainer = (titleSpan: Element): HTMLSpanElement => {
  const existing = titleSpan.querySelector<HTMLSpanElement>('.v-stats-hot-container');
  if (existing) return existing;
  const container = document.createElement('span');
  container.classList.add('v-stats-hot-container');
  const anchor = titleSpan.querySelector('a[href*="/t/"]');
  if (anchor && anchor.nextSibling) {
    titleSpan.insertBefore(container, anchor.nextSibling);
  } else if (anchor) {
    titleSpan.appendChild(container);
  } else {
    titleSpan.prepend(container);
  }
  return container;
};

// 今日热议：状态标签（新帖子）。热议列表无回复数 DOM，仅支持「新帖子」标签
const processHotTopicAnchor = async (username: string, anchor: HTMLAnchorElement) => {
  const postId = getHotTopicPostId(anchor);
  if (!postId) return;
  const titleSpan = anchor.closest('.item_hot_topic_title');
  if (!titleSpan) return;
  const container = getOrCreateHotContainer(titleSpan);
  const postStatus = await getPostStatus(username, postId);
  if (!postStatus) {
    if (await isPostBrowsingMarkNewPosts()) applyHotLabel(container, 'new', '#fa8c16');
    return;
  }
  clearHotLabel(container);
};

export const updateHotTopicsLabel = async (username: string) => {
  if (!await isPostBrowsingApplyToHotTopics()) return;
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;
  const anchors = box.querySelectorAll<HTMLAnchorElement>('.item_hot_topic_title a[href*="/t/"]');
  for (const a of anchors) await processHotTopicAnchor(username, a);
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

// 今日热议：为每条帖子添加 inline 忽略按钮
export const initHotTopicIgnoreButtons = async (username: string) => {
  if (!await isPostBrowsingApplyToHotTopics() || !await isUIShowIgnoreUpdateConfig()) return;
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;
  const cells = xpath.findNodes<HTMLDivElement>(V2EX_HOT_TOPICS_SHOWN_CELL_XPATH, document.body);
  for (const cell of cells) {
    const postId = getHotTopicPostId(cell);
    if (!postId) continue;
    const titleSpan = cell.querySelector('.item_hot_topic_title');
    if (!titleSpan) continue;
    const container = getOrCreateHotContainer(titleSpan);
    if (container.querySelector('.v-stats-hot-ignore-btn')) continue;
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
  if (!await isPostBrowsingApplyToHotTopics() || !await isUIShowIgnoreUpdateConfig()) return;
  const box = document.getElementById(V2EX_HOT_TOPICS_BOX_ID);
  if (!box) return;
  const hidden = box.querySelector('.v-stats-removed-posts');
  if (!hidden) return;
  const cells = xpath.findNodes<HTMLDivElement>(`.//div[contains(@class, "cell") and contains(@class, "hot_t_")]`, hidden);
  for (const cell of cells) {
    const postId = getHotTopicPostId(cell);
    if (!postId) continue;
    const titleSpan = cell.querySelector('.item_hot_topic_title');
    if (!titleSpan) continue;
    const container = getOrCreateHotContainer(titleSpan);
    if (container.querySelector('.v-stats-hot-recover-btn')) continue;
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
