/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';

// 直接提取 testIsV2EX 函数进行测试
const testIsV2EX = (hostname: string) => {
  return /^(?:([a-z0-9-]+\.)*)v2ex\.com$/.test(hostname);
};

describe('testIsV2EX', () => {
  describe('有效的 V2EX 域名', () => {
    it('应该正确识别主域名 v2ex.com', () => {
      expect(testIsV2EX('v2ex.com')).toBe(true);
    });

    it('应该正确识别 www 子域名', () => {
      expect(testIsV2EX('www.v2ex.com')).toBe(true);
    });

    it('应该正确识别单个字母的子域名', () => {
      const singleLetterSubdomains = ['a.v2ex.com', 'b.v2ex.com', 'z.v2ex.com'];
      
      singleLetterSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true);
      });
    });

    it('应该正确识别数字子域名', () => {
      const numericSubdomains = ['1.v2ex.com', '123.v2ex.com', '999.v2ex.com'];
      
      numericSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true);
      });
    });

    it('应该正确识别包含连字符的子域名', () => {
      const hyphenSubdomains = [
        'test-site.v2ex.com',
        'my-app.v2ex.com',
        'api-v1.v2ex.com',
        'user-123.v2ex.com'
      ];
      
      hyphenSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true);
      });
    });

    it('应该正确识别多级子域名', () => {
      const multiLevelSubdomains = [
        'api.app.v2ex.com',
        'cdn.static.v2ex.com',
        'user.profile.v2ex.com',
        'a.b.c.v2ex.com'
      ];
      
      multiLevelSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true);
      });
    });

    it('应该正确识别复杂的子域名组合', () => {
      const complexSubdomains = [
        'api-v2.service.v2ex.com',
        'cdn-123.assets.v2ex.com',
        'user-profile-123.app.v2ex.com'
      ];
      
      complexSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true);
      });
    });

    it('应该正确识别实际使用的 V2EX 子域名', () => {
      const realSubdomains = [
        'cn.v2ex.com',
        'us.v2ex.com',
        'global.v2ex.com',
        'fast.v2ex.com',
        'hk.v2ex.com',
        'jp.v2ex.com',
        'origin.v2ex.com',
        's.v2ex.com',
        'staging.v2ex.com',
        'de.v2ex.com'
      ];
      
      realSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true);
      });
    });
  });

  describe('无效的域名', () => {
    it('应该拒绝其他网站的域名', () => {
      const otherDomains = [
        'google.com',
        'github.com',
        'stackoverflow.com',
        'example.com',
        'test.com'
      ];
      
      otherDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该拒绝类似但不同的域名', () => {
      const similarDomains = [
        'v2ex.net',
        'v2ex.org',
        'v2ex.cn',
        'v2exx.com',
        'v2ex-clone.com'
      ];
      
      similarDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该拒绝包含 v2ex.com 但不以其结尾的域名', () => {
      const invalidDomains = [
        'v2ex.com.fake.com',
        'v2ex.com.evil.org',
        'v2ex.com.phishing.net',
        'fake-v2ex.com.malware.site'
      ];
      
      invalidDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该拒绝不以 v2ex.com 开头的域名', () => {
      const prefixDomains = [
        'not-v2ex.com',
        'fake-v2ex.com',
        'evil-v2ex.com',
        'phishing-v2ex.com'
      ];
      
      prefixDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该拒绝包含大写字母的子域名', () => {
      const uppercaseSubdomains = [
        'WWW.v2ex.com',
        'API.v2ex.com',
        'Test.v2ex.com',
        'USER-Profile.v2ex.com'
      ];
      
      uppercaseSubdomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该拒绝包含特殊字符的子域名', () => {
      const specialCharDomains = [
        'api_.v2ex.com',
        'test@.v2ex.com',
        'user#.v2ex.com',
        'app$.v2ex.com',
        'site%.v2ex.com'
      ];
      
      specialCharDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('当前正则表达式允许连字符在开头或结尾（设计缺陷）', () => {
      // 注意：这反映了当前正则表达式的实际行为，虽然不是最佳实践
      const hyphenEdgeCases = [
        '-test.v2ex.com',
        'test-.v2ex.com',
        '-api-.v2ex.com'
      ];
      
      hyphenEdgeCases.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(true); // 当前正则允许这种情况
      });
    });
  });

  describe('边界情况和特殊输入', () => {
    it('应该处理空字符串', () => {
      expect(testIsV2EX('')).toBe(false);
    });

    it('应该处理只有域名后缀的情况', () => {
      expect(testIsV2EX('.com')).toBe(false);
      expect(testIsV2EX('.v2ex.com')).toBe(false);
    });

    it('应该处理缺少顶级域名的情况', () => {
      expect(testIsV2EX('v2ex')).toBe(false);
      expect(testIsV2EX('www.v2ex')).toBe(false);
    });

    it('应该处理包含空格的域名', () => {
      const spaceDomains = [
        ' v2ex.com',
        'v2ex.com ',
        ' v2ex.com ',
        'www .v2ex.com',
        'www. v2ex.com'
      ];
      
      spaceDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该处理包含路径的URL', () => {
      const urlsWithPaths = [
        'v2ex.com/path',
        'www.v2ex.com/user/123',
        'api.v2ex.com/v1/data'
      ];
      
      urlsWithPaths.forEach(url => {
        expect(testIsV2EX(url)).toBe(false);
      });
    });

    it('应该处理包含协议的完整URL', () => {
      const fullUrls = [
        'https://v2ex.com',
        'http://www.v2ex.com',
        'ftp://files.v2ex.com'
      ];
      
      fullUrls.forEach(url => {
        expect(testIsV2EX(url)).toBe(false);
      });
    });

    it('应该处理包含端口号的域名', () => {
      const domainsWithPorts = [
        'v2ex.com:80',
        'www.v2ex.com:443',
        'api.v2ex.com:8080'
      ];
      
      domainsWithPorts.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });

    it('应该处理非常长的子域名', () => {
      const veryLongSubdomain = 'a'.repeat(63) + '.v2ex.com';
      expect(testIsV2EX(veryLongSubdomain)).toBe(true);
      
      // 超过限制的子域名
      const tooLongSubdomain = 'a'.repeat(64) + '.v2ex.com';
      expect(testIsV2EX(tooLongSubdomain)).toBe(true); // 正则表达式本身不限制长度
    });

    it('应该处理多个连续的点', () => {
      const doubleDotDomains = [
        'www..v2ex.com',
        'api...v2ex.com',
        '..v2ex.com'
      ];
      
      doubleDotDomains.forEach(domain => {
        expect(testIsV2EX(domain)).toBe(false);
      });
    });
  });

  describe('正则表达式行为验证', () => {
    it('验证正则表达式的完整匹配行为', () => {
      // 这些应该匹配
      expect(testIsV2EX('v2ex.com')).toBe(true);
      expect(testIsV2EX('sub.v2ex.com')).toBe(true);
      expect(testIsV2EX('a-b.v2ex.com')).toBe(true);
      expect(testIsV2EX('123.v2ex.com')).toBe(true);
      
      // 这些不应该匹配
      expect(testIsV2EX('xv2ex.com')).toBe(false); // 前缀
      expect(testIsV2EX('v2ex.comx')).toBe(false); // 后缀
      expect(testIsV2EX('v2ex.com.evil')).toBe(false); // 后缀域名
    });

    it('验证子域名格式的严格性', () => {
      // 有效的子域名格式
      expect(testIsV2EX('a.v2ex.com')).toBe(true);
      expect(testIsV2EX('a1.v2ex.com')).toBe(true);
      expect(testIsV2EX('a-b.v2ex.com')).toBe(true);
      expect(testIsV2EX('a1-b2.v2ex.com')).toBe(true);
      
      // 无效的子域名格式
      expect(testIsV2EX('A.v2ex.com')).toBe(false); // 大写字母
      expect(testIsV2EX('a_.v2ex.com')).toBe(false); // 下划线
      expect(testIsV2EX('a@.v2ex.com')).toBe(false); // 特殊字符
      
      // 注意：当前正则表达式允许连字符在开头和结尾（虽然不符合DNS规范）
      expect(testIsV2EX('-a.v2ex.com')).toBe(true); // 当前正则允许以连字符开头
      expect(testIsV2EX('a-.v2ex.com')).toBe(true); // 当前正则允许以连字符结尾
    });

    it('DNS规范建议（当前未实现）', () => {
      // 此测试记录了更严格的DNS规范要求，供将来改进参考
      // 根据RFC规范，域名标签不应以连字符开头或结尾
      
      // 以下域名在严格的DNS规范中应该被拒绝，但当前正则表达式接受它们：
      expect(testIsV2EX('-test.v2ex.com')).toBe(true); // 现在: true, 理想: false
      expect(testIsV2EX('test-.v2ex.com')).toBe(true); // 现在: true, 理想: false
      expect(testIsV2EX('-api-.v2ex.com')).toBe(true); // 现在: true, 理想: false
      
      // 如果将来要改进正则表达式，可以考虑使用：
      // /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*)v2ex\.com$/
      // 这个正则会确保每个标签以字母数字开头和结尾
    });
  });
}); 