import { describe, it, expect } from 'vitest';
import { getPostInfo } from '../../../service/history/collect';

describe('getPostInfo', () => {
  it('应该从指定的测试数据中正确解析帖子ID和回复数量', () => {
    const pathname = '/t/1147518#reply8';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '1147518',
      replyCount: 8
    });
  });

  it('应该从带有回复锚点的路径中解析帖子信息', () => {
    const pathname = '/t/1147472#reply30';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '1147472',
      replyCount: 30
    });
  });

  it('应该在没有reply锚点时返回空帖子ID和0回复数', () => {
    const pathname = '/t/1147472';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该解析单个数字的回复数量', () => {
    const pathname = '/t/123456#reply1';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '123456',
      replyCount: 1
    });
  });

  it('应该解析大的回复数量', () => {
    const pathname = '/t/987654#reply999';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '987654',
      replyCount: 999
    });
  });

  it('应该在没有reply锚点的长帖子ID时返回空', () => {
    const pathname = '/t/9876543210';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该处理更长的帖子ID带回复', () => {
    const pathname = '/t/9876543210#reply123';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '9876543210',
      replyCount: 123
    });
  });

  it('应该在无效路径时返回空帖子ID和0回复数', () => {
    const pathname = '/invalid/path';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该在路径不包含帖子ID时返回空帖子ID和0回复数', () => {
    const pathname = '/t/';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该在路径格式错误时返回空帖子ID和0回复数', () => {
    const pathname = '/t/abc123';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该在回复格式错误时解析帖子ID但回复数为0', () => {
    const pathname = '/t/123456#replyabc';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '123456',
      replyCount: 0
    });
  });

  it('应该处理只有reply关键字没有数字的情况', () => {
    const pathname = '/t/123456#reply';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '123456',
      replyCount: 0
    });
  });

  it('应该在缺少reply关键字时返回空帖子ID', () => {
    const pathname = '/t/123456#8';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该处理根路径', () => {
    const pathname = '/';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });

  it('应该处理包含完整URL的情况', () => {
    const pathname = 'https://www.v2ex.com/t/1147518#reply8';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '1147518',
      replyCount: 8
    });
  });

  it('应该在包含查询参数时无法解析', () => {
    const pathname = '/t/123456?from=timeline#reply5';
    const result = getPostInfo(pathname);
    expect(result).toEqual({
      postId: '',
      replyCount: 0
    });
  });
}); 