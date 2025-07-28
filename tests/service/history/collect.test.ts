import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPostInfo } from '../../../service/history/collect';

// 全局 DOM 设置
let mockDocument: Document;
let postHtmlContent: string;

beforeAll(() => {
  // 读取测试用的 HTML 文件
  const htmlPath = join(__dirname, 'post.html');
  postHtmlContent = readFileSync(htmlPath, 'utf-8');
  
  // 创建 JSDOM 实例
  const dom = new JSDOM(postHtmlContent, {
    url: 'https://www.v2ex.com/t/1147555',
    contentType: 'text/html',
    resources: 'usable'
  });
  
  mockDocument = dom.window.document;
  
  // 设置全局 document 和 window 对象
  global.document = mockDocument;
  global.window = dom.window as any;
  
  // 设置 XPathResult 常量，JSDOM 没有完全实现这些
  global.XPathResult = {
    ANY_TYPE: 0,
    NUMBER_TYPE: 1,
    STRING_TYPE: 2,
    BOOLEAN_TYPE: 3,
    UNORDERED_NODE_ITERATOR_TYPE: 4,
    ORDERED_NODE_ITERATOR_TYPE: 5,
    UNORDERED_NODE_SNAPSHOT_TYPE: 6,
    ORDERED_NODE_SNAPSHOT_TYPE: 7,
    ANY_UNORDERED_NODE_TYPE: 8,
    FIRST_ORDERED_NODE_TYPE: 9
  } as any;
});

describe('getPostInfo', () => {
  describe('DOM 解析测试', () => {
    it('应该从 post.html 文件中正确解析帖子ID和回复数量', () => {
      const pathname = 'https://www.v2ex.com/t/1147555#reply29';
      const result = getPostInfo(pathname, mockDocument);
      
      // 从真实的 HTML 文件中，这个帖子有 29 条回复
      expect(result).toEqual({
        postId: '1147555',
        replyCount: 29
      });
    });

    it('应该优先使用 DOM 解析的回复数而不是 URL 中的数字', () => {
      // URL 中显示 reply50，但实际 DOM 中是 29 条回复
      const pathname = 'https://www.v2ex.com/t/1147555#reply50';
      const result = getPostInfo(pathname, mockDocument);
      
      expect(result).toEqual({
        postId: '1147555',
        replyCount: 29 // DOM 解析结果应该优先
      });
    });

    it('应该在没有回复锚点时也能解析帖子ID并从DOM获取回复数', () => {
      const pathname = '/t/1147555';
      const result = getPostInfo(pathname, mockDocument);
      
      // 新逻辑：没有 reply 锚点时也能解析帖子ID，并从DOM获取回复数
      expect(result).toEqual({
        postId: '1147555',
        replyCount: 29 // 从DOM解析得到
      });
    });

    it('应该在只有帖子ID时使用默认回复数0，但DOM解析优先', () => {
      const pathname = '/t/1147555';
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '1147555',
        replyCount: 0 // DOM解析失败时使用默认值
      });
    });
  });

  describe('URL 解析回退测试', () => {
    it('应该在 DOM 解析失败时回退到 URL 解析', () => {
      // 创建一个空的 document 来模拟 DOM 解析失败
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/1147518#reply8';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '1147518',
        replyCount: 8
      });
    });

    it('应该从带有回复锚点的路径中解析帖子信息', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/1147472#reply30';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '1147472',
        replyCount: 30
      });
    });

    it('应该在无效路径时返回空帖子ID和0回复数', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/invalid/path';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '',
        replyCount: 0
      });
    });

    it('应该在没有帖子ID的路径时返回空帖子ID和0回复数', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '',
        replyCount: 0
      });
    });

    it('应该在只有 /t 路径时返回空帖子ID和0回复数', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '',
        replyCount: 0
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理解析单个数字的回复数量', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/123456#reply1';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '123456',
        replyCount: 1
      });
    });

    it('应该处理解析大的回复数量', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/987654#reply999';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '987654',
        replyCount: 999
      });
    });

    it('应该在回复格式错误时解析帖子ID但回复数为0', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/123456#replyabc';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '123456',
        replyCount: 0
      });
    });

    it('应该处理只有 reply 关键字没有数字的情况', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/123456#reply';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '123456',
        replyCount: 0
      });
    });

    it('应该处理完整URL格式', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = 'https://www.v2ex.com/t/123456#reply10';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '123456',
        replyCount: 10
      });
    });

    it('应该处理带查询参数的URL', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/123456?from=timeline';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '123456',
        replyCount: 0
      });
    });

    it('应该处理非数字帖子ID', () => {
      const emptyDom = new JSDOM('<html><body></body></html>');
      const emptyDocument = emptyDom.window.document;
      
      const pathname = '/t/abc123#reply5';
      const result = getPostInfo(pathname, emptyDocument);
      
      expect(result).toEqual({
        postId: '',
        replyCount: 0
      });
    });
  });
}); 