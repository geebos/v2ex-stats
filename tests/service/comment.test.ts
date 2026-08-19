import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CommentInfo,
  countRenderedComments,
  filterDanmakuComments,
  getCurrentPage,
  getPagesToLoad,
  parseComments,
  parseThanksCount,
} from '../../service/comment';

// 全局 DOM 设置
let mockDocument: Document;

beforeAll(() => {
  // 读取测试用的 HTML 文件
  const htmlPath = join(__dirname, 'history', 'post.html');
  const postHtmlContent = readFileSync(htmlPath, 'utf-8');

  // 创建 JSDOM 实例
  const dom = new JSDOM(postHtmlContent, {
    url: 'https://www.v2ex.com/t/1147555',
    contentType: 'text/html',
    resources: 'usable'
  });

  mockDocument = dom.window.document;
});

// 创建包含单个评论 cell 的测试文档
const createCellDocument = (cellHtml: string): Document => {
  const dom = new JSDOM(`<html><body><div id="Main">${cellHtml}</div></body></html>`);
  return dom.window.document;
};

describe('parseComments', () => {
  it('应该从 post.html 中解析出全部 29 条评论', () => {
    const comments = parseComments(mockDocument, 1);
    expect(comments).toHaveLength(29);
  });

  it('应该正确解析第一条评论的完整信息', () => {
    const comments = parseComments(mockDocument, 1);
    const first = comments[0];

    expect(first.id).toBe('16532903');
    expect(first.floor).toBe(1);
    expect(first.username).toBe('samzong');
    expect(first.avatar).toContain('cdn.v2ex.com/avatar');
    expect(first.content).toBe('这个感觉是 cursor 的自定义模式？');
    expect(first.thanksCount).toBe(0);
    expect(first.page).toBe(1);
  });

  it('应该正确解析最后一条评论的楼层号', () => {
    const comments = parseComments(mockDocument, 1);
    const last = comments[comments.length - 1];
    expect(last.floor).toBe(29);
  });

  it('应该为抓取的评论标记正确的页码', () => {
    const comments = parseComments(mockDocument, 3);
    expect(comments).toHaveLength(29);
    expect(comments.every(c => c.page === 3)).toBe(true);
  });

  it('应该跳过没有 r_ 前缀 ID 的元素', () => {
    const doc = createCellDocument(`
      <div class="cell"><div class="reply_content">没有 ID 的评论</div></div>
      <div id="r_999" class="cell"><div class="reply_content">有 ID 的评论</div></div>
    `);
    const comments = parseComments(doc, 1);
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe('999');
  });
});

describe('parseThanksCount', () => {
  it('应该解析 V2EX 原生 ❤️ 图标后的感谢次数', () => {
    const doc = createCellDocument(`
      <div id="r_1" class="cell">
        <div class="fr"><div id="thank_area_1" class="thank_area"><img alt="❤️" src="/static/img/heart.png"> 5 </div></div>
        <div class="reply_content">感谢次数为 5 的评论</div>
      </div>
    `);
    const cell = doc.querySelector('#r_1')!;
    expect(parseThanksCount(cell)).toBe(5);
  });

  it('应该解析 V2EX Polish 的 .v2p-icon-heart 后的感谢次数', () => {
    const doc = createCellDocument(`
      <div id="r_2" class="cell">
        <div class="fr"><div id="thank_area_2" class="thank_area"><i class="v2p-icon-heart"></i> 3 </div></div>
        <div class="reply_content">V2EX Polish 的评论</div>
      </div>
    `);
    const cell = doc.querySelector('#r_2')!;
    expect(parseThanksCount(cell)).toBe(3);
  });

  it('没有感谢标记时返回 0', () => {
    const doc = createCellDocument(`
      <div id="r_3" class="cell">
        <div class="fr"><div id="thank_area_3" class="thank_area"><a class="thank">感谢回复者</a></div></div>
        <div class="reply_content">没有收到感谢的评论</div>
      </div>
    `);
    const cell = doc.querySelector('#r_3')!;
    expect(parseThanksCount(cell)).toBe(0);
  });

  it('不会把"感谢回复者"链接误判为感谢次数', () => {
    const doc = createCellDocument(`
      <div id="r_4" class="cell">
        <div class="fr"><div id="thank_area_4" class="thank_area"><a class="thank">感谢回复者</a></div></div>
        <div class="reply_content">普通评论内容</div>
      </div>
    `);
    const cell = doc.querySelector('#r_4')!;
    expect(parseThanksCount(cell)).toBe(0);
  });
});

describe('filterDanmakuComments', () => {
  const comments: CommentInfo[] = [
    { id: '1', floor: 1, username: 'a', avatar: '', content: '短评论', thanksCount: 0, page: 1 },
    { id: '2', floor: 2, username: 'b', avatar: '', content: '这是一条长度远超四十个字符的评论内容，用来验证最大文本长度过滤逻辑是否正常工作，确保超长的评论不会渲染为弹幕', thanksCount: 0, page: 1 },
  ];

  it('应该只保留文本长度小于最大文本长度的评论', () => {
    const filtered = filterDanmakuComments(comments, 40);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('最大文本长度边界：长度等于限制时不渲染为弹幕', () => {
    const equal = { id: '3', floor: 3, username: 'c', avatar: '', content: 'x'.repeat(40), thanksCount: 0, page: 1 };
    const filtered = filterDanmakuComments([...comments, equal], 40);
    expect(filtered.some(c => c.id === '3')).toBe(false);
  });
});

describe('countRenderedComments', () => {
  it('应该统计当前文档中已渲染的评论数量', () => {
    expect(countRenderedComments(mockDocument)).toBe(29);
  });

  it('应该识别评论预加载插件插入的评论（通用识别）', () => {
    const doc = createCellDocument(`
      <div id="r_101" class="cell"><div class="reply_content">预加载评论 1</div></div>
      <div id="r_102" class="cell"><div class="reply_content">预加载评论 2</div></div>
      <div id="r_103" class="cell"><div class="reply_content">预加载评论 3</div></div>
    `);
    expect(countRenderedComments(doc)).toBe(3);
  });
});

describe('getCurrentPage', () => {
  it('应该解析 URL 中的页码', () => {
    expect(getCurrentPage('https://www.v2ex.com/t/123?p=2')).toBe(2);
  });

  it('没有 p 参数时默认第 1 页', () => {
    expect(getCurrentPage('https://www.v2ex.com/t/123')).toBe(1);
  });

  it('p 参数非法时回退到第 1 页', () => {
    expect(getCurrentPage('https://www.v2ex.com/t/123?p=abc')).toBe(1);
    expect(getCurrentPage('https://www.v2ex.com/t/123?p=0')).toBe(1);
    expect(getCurrentPage('https://www.v2ex.com/t/123?p=-3')).toBe(1);
  });
});

describe('getPagesToLoad', () => {
  it('当前评论数已满足目标时不加载任何分页', () => {
    expect(getPagesToLoad(100, 250, 1, 100)).toEqual([]);
    expect(getPagesToLoad(120, 250, 2, 100)).toEqual([]);
  });

  it('评论数不足时加载后续分页直到满足目标', () => {
    expect(getPagesToLoad(50, 250, 1, 100)).toEqual([2]);
    expect(getPagesToLoad(50, 250, 1, 200)).toEqual([2, 3]);
  });

  it('没有更多分页（总评论数不足）时不加载', () => {
    expect(getPagesToLoad(30, 30, 1, 100)).toEqual([]);
    expect(getPagesToLoad(100, 100, 1, 200)).toEqual([]);
  });

  it('加载到最后一页仍未满足目标时停止', () => {
    // 总评论 380 条共 4 页，加载完剩余分页后停止
    expect(getPagesToLoad(80, 380, 1, 500)).toEqual([2, 3, 4]);
  });

  it('当前已在最后一页时不加载', () => {
    expect(getPagesToLoad(80, 250, 3, 200)).toEqual([]);
  });

  it('目标数量为 0 时不加载', () => {
    expect(getPagesToLoad(10, 250, 1, 0)).toEqual([]);
  });
});
