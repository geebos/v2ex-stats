// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CONTAINER_ID = 'v-stats-danmaku-container';
const CLOSE_BUTTON_ID = 'v-stats-danmaku-close';
const ITEM_SELECTOR = '.v-stats-danmaku-item';

// 弹幕评论池（3 条：1 条热门 + 2 条普通）
const mockComments = vi.hoisted(() => [
  { id: '1', floor: 1, username: 'a', avatar: 'https://cdn.v2ex.com/avatar/a.png', content: '第一条弹幕', thanksCount: 3, page: 1 },
  { id: '2', floor: 2, username: 'b', avatar: 'https://cdn.v2ex.com/avatar/b.png', content: '第二条弹幕', thanksCount: 0, page: 1 },
  { id: '3', floor: 3, username: 'c', avatar: 'https://cdn.v2ex.com/avatar/c.png', content: '第三条弹幕', thanksCount: 0, page: 1 },
]);

// 弹幕模块依赖的服务全部打桩，只验证发射与停止行为
vi.mock('@/service/config', () => ({
  isDanmakuEnabled: async () => true,
  getDanmakuConfig: async () => ({
    enabled: true,
    speed: 100,
    fontSize: 14,
    maxTextLength: 40,
    autoLoadCommentCount: 100,
    opacity: 1,
  }),
}));

vi.mock('@/service/history/collect', () => ({
  getPostInfo: () => ({ postId: '1147555', replyCount: mockComments.length }),
}));

vi.mock('@/service/comment', () => ({
  parseComments: () => mockComments,
  filterDanmakuComments: (comments: unknown[]) => comments,
  countRenderedComments: () => mockComments.length,
  getCurrentPage: () => 1,
  getPagesToLoad: () => [],
}));

vi.mock('@/service/utils', () => ({
  getIsDarkMode: () => false,
}));

// 启动弹幕（每次动态导入，避免模块级初始化状态在用例间复用）
const startDanmaku = async () => {
  const { initDanmaku } = await import('@/ui/danmaku.ui');
  await initDanmaku();
};

const findItems = () => Array.from(document.querySelectorAll<HTMLElement>(ITEM_SELECTOR));

// 推进定时器，让发射循环跑到底（jsdom 不执行 CSS 动画，弹幕会一直留在 DOM 中）
const runSpawnLoop = async () => {
  for (let i = 0; i < 10; i++) {
    await vi.advanceTimersByTimeAsync(5000);
  }
};

describe('danmaku.ui 弹幕发射与关闭', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('每条弹幕只滚动一次：评论池发射完毕后不再重复发射', async () => {
    await startDanmaku();
    await runSpawnLoop();

    const items = findItems();
    expect(items).toHaveLength(mockComments.length);
    expect(items.map(item => item.querySelector('.v-stats-danmaku-content')?.textContent))
      .toEqual(expect.arrayContaining(mockComments.map(comment => comment.content)));

    // 继续等待也不会补发弹幕
    await runSpawnLoop();
    expect(findItems()).toHaveLength(mockComments.length);
  });

  it('全部弹幕滚动完毕后自动停止并移除弹幕层与关闭按钮', async () => {
    await startDanmaku();
    await runSpawnLoop();

    const items = findItems();
    expect(items).toHaveLength(mockComments.length);

    // 模拟弹幕滚出屏幕
    items.forEach(item => item.dispatchEvent(new Event('animationend')));

    expect(document.getElementById(CONTAINER_ID)).toBeNull();
    expect(document.getElementById(CLOSE_BUTTON_ID)).toBeNull();
  });

  it('点击关闭按钮后立即停止弹幕，且不再发射新弹幕', async () => {
    await startDanmaku();

    const button = document.getElementById(CLOSE_BUTTON_ID);
    expect(document.getElementById(CONTAINER_ID)).not.toBeNull();
    expect(button?.title).toBe('关闭弹幕');

    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.getElementById(CONTAINER_ID)).toBeNull();
    expect(document.getElementById(CLOSE_BUTTON_ID)).toBeNull();
    expect(findItems()).toHaveLength(0);

    await runSpawnLoop();
    expect(findItems()).toHaveLength(0);
  });
});
