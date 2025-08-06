/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getIsDarkMode, adjustChartDarkMode, formatTimestamp, testIsV2EX, getMonthStartTimestamp, getMonthEndTimestamp, getHourStartTimestamp, parseTimeToTimestamp } from '../../service/utils';
import * as echarts from 'echarts';

// 测试环境初始化
beforeEach(() => {
  // 重置DOM环境
  document.body.className = '';
  document.body.innerHTML = '';
  
  // 清理所有模拟
  vi.clearAllMocks();
});

// ==================== 暗色模式检测测试 ====================
describe('getIsDarkMode', () => {
  it('应该在body包含dark类名时返回true', () => {
    document.body.classList.add('dark-theme');
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在body包含DARK类名时返回true', () => {
    document.body.classList.add('DARK-MODE');
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在V2EX原生暗色模式切换按钮为dark时返回true', () => {
    const toggleImg = document.createElement('img');
    toggleImg.setAttribute('alt', 'dark');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在V2EX原生暗色模式切换按钮为DARK时返回true', () => {
    const toggleImg = document.createElement('img');
    toggleImg.setAttribute('alt', 'DARK');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(true);
  });

  it('应该在V2EX原生暗色模式切换按钮为light时返回false', () => {
    const toggleImg = document.createElement('img');
    toggleImg.setAttribute('alt', 'light');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(false);
  });

  it('应该在没有暗色模式标识时返回false', () => {
    document.body.classList.add('light-theme');
    
    expect(getIsDarkMode()).toBe(false);
  });

  it('应该在没有切换按钮时返回false', () => {
    expect(getIsDarkMode()).toBe(false);
  });

  it('应该在切换按钮没有alt属性时返回false', () => {
    const toggleImg = document.createElement('img');
    
    const toggle = document.createElement('div');
    toggle.className = 'light-toggle';
    toggle.appendChild(toggleImg);
    
    document.body.appendChild(toggle);
    
    expect(getIsDarkMode()).toBe(false);
  });
});

// ==================== 图表暗色主题适配测试 ====================
describe('adjustChartDarkMode', () => {
  it('应该在暗色模式下添加背景色和颜色配置', () => {
    // 模拟暗色模式
    document.body.classList.add('dark');
    
    const option: echarts.EChartsCoreOption = {
      title: { text: 'Test Chart' }
    };
    
    const result = adjustChartDarkMode(option);
    
    expect(result.backgroundColor).toBe('transparent');
    expect(result.color).toEqual([
      '#dd6b66',
      '#759aa0',
      '#e69d87',
      '#8dc1a9',
      '#ea7e53',
      '#eedd78',
      '#73a373',
      '#73b9bc',
      '#7289ab',
      '#91ca8c',
      '#f49f42'
    ]);
    expect(result.title).toEqual({ text: 'Test Chart' });
  });

  it('应该在亮色模式下不修改配置', () => {
    const option: echarts.EChartsCoreOption = {
      title: { text: 'Test Chart' },
      backgroundColor: 'white'
    };
    
    const result = adjustChartDarkMode(option);
    
    expect(result).toBe(option);
    expect(result.backgroundColor).toBe('white');
    expect(result.color).toBeUndefined();
  });

  it('应该保持原有配置不变', () => {
    document.body.classList.add('dark');
    
    const option: echarts.EChartsCoreOption = {
      title: { text: 'Original Title' },
      xAxis: { type: 'category' },
      yAxis: { type: 'value' }
    };
    
    const result = adjustChartDarkMode(option);
    
    expect(result.title).toEqual({ text: 'Original Title' });
    expect(result.xAxis).toEqual({ type: 'category' });
    expect(result.yAxis).toEqual({ type: 'value' });
  });
});

// ==================== 时间戳格式化测试 ====================
describe('formatTimestamp', () => {
  // 使用本地时间进行测试
  const testTimestamp = new Date(2024, 2, 15, 14, 30, 45, 123).getTime();

  it('应该正确格式化年粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'year');
    expect(result).toBe('2024');
  });

  it('应该正确格式化月粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'month');
    expect(result).toBe('2024/03');
  });

  it('应该正确格式化日粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'day');
    expect(result).toBe('2024/03/15');
  });

  it('应该正确格式化小时粒度时间戳', () => {
    const result = formatTimestamp(testTimestamp, 'hour');
    expect(result).toBe('03/15 14');
  });

  it('应该在未知粒度时返回ISO字符串', () => {
    // @ts-ignore - 测试未知粒度
    const result = formatTimestamp(testTimestamp, 'unknown');
    expect(result).toBe(new Date(testTimestamp).toISOString());
  });

  it('应该正确处理月份和日期的零填充', () => {
    const timestamp = new Date(2024, 0, 5, 8, 30, 45, 123).getTime();
    
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/01');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/01/05');
    expect(formatTimestamp(timestamp, 'hour')).toBe('01/05 08');
  });

  it('应该正确处理12月的时间', () => {
    const timestamp = new Date(2024, 11, 25, 23, 30, 45, 123).getTime();
    
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/12');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/12/25');
    expect(formatTimestamp(timestamp, 'hour')).toBe('12/25 23');
  });

  it('应该正确处理年初的时间', () => {
    const timestamp = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    expect(formatTimestamp(timestamp, 'year')).toBe('2024');
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/01');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/01/01');
    expect(formatTimestamp(timestamp, 'hour')).toBe('01/01 00');
  });

  it('应该正确处理年末的时间', () => {
    const timestamp = new Date(2024, 11, 31, 23, 59, 59, 999).getTime();
    
    expect(formatTimestamp(timestamp, 'year')).toBe('2024');
    expect(formatTimestamp(timestamp, 'month')).toBe('2024/12');
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/12/31');
    expect(formatTimestamp(timestamp, 'hour')).toBe('12/31 23');
  });

  it('应该正确处理闰年2月29日', () => {
    const timestamp = new Date(2024, 1, 29, 12, 0, 0, 0).getTime();
    
    expect(formatTimestamp(timestamp, 'day')).toBe('2024/02/29');
    expect(formatTimestamp(timestamp, 'hour')).toBe('02/29 12');
  });
});

// ==================== V2EX域名检测测试 ====================
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

// ==================== 月份时间戳处理测试 ====================
describe('getMonthStartTimestamp', () => {
  it('应该返回月初第一天的00:00:00时间戳', () => {
    // 2024年3月15日 14:30:45 -> 2024年3月1日 00:00:00
    const inputTimestamp = new Date(2024, 2, 15, 14, 30, 45, 123).getTime();
    const expectedTimestamp = new Date(2024, 2, 1, 0, 0, 0, 0).getTime();
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理1月份', () => {
    const inputTimestamp = new Date(2024, 0, 15, 10, 30, 0).getTime();
    const expectedTimestamp = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理12月份', () => {
    const inputTimestamp = new Date(2024, 11, 25, 23, 59, 59).getTime();
    const expectedTimestamp = new Date(2024, 11, 1, 0, 0, 0, 0).getTime();
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理闰年2月', () => {
    const inputTimestamp = new Date(2024, 1, 29, 12, 0, 0).getTime(); // 2024年2月29日
    const expectedTimestamp = new Date(2024, 1, 1, 0, 0, 0, 0).getTime();
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理平年2月', () => {
    const inputTimestamp = new Date(2023, 1, 28, 12, 0, 0).getTime(); // 2023年2月28日
    const expectedTimestamp = new Date(2023, 1, 1, 0, 0, 0, 0).getTime();
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理月初的时间', () => {
    // 输入已经是月初，应该返回当天00:00:00
    const inputTimestamp = new Date(2024, 3, 1, 15, 30, 45).getTime();
    const expectedTimestamp = new Date(2024, 3, 1, 0, 0, 0, 0).getTime();
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理跨年边界', () => {
    const inputTimestamp = new Date(2023, 11, 31, 23, 59, 59).getTime(); // 2023年12月31日
    const expectedTimestamp = new Date(2023, 11, 1, 0, 0, 0, 0).getTime(); // 2023年12月1日
    
    const result = getMonthStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });
});

describe('getMonthEndTimestamp', () => {
  it('应该返回月末最后一天的23:59:59.999时间戳', () => {
    // 2024年3月15日 14:30:45 -> 2024年3月31日 23:59:59.999
    const inputTimestamp = new Date(2024, 2, 15, 14, 30, 45, 123).getTime();
    const expectedTimestamp = new Date(2024, 2, 31, 23, 59, 59, 999).getTime();
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理1月份（31天）', () => {
    const inputTimestamp = new Date(2024, 0, 15, 10, 30, 0).getTime();
    const expectedTimestamp = new Date(2024, 0, 31, 23, 59, 59, 999).getTime();
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理4月份（30天）', () => {
    const inputTimestamp = new Date(2024, 3, 15, 10, 30, 0).getTime();
    const expectedTimestamp = new Date(2024, 3, 30, 23, 59, 59, 999).getTime();
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理闰年2月（29天）', () => {
    const inputTimestamp = new Date(2024, 1, 15, 12, 0, 0).getTime(); // 2024年2月15日
    const expectedTimestamp = new Date(2024, 1, 29, 23, 59, 59, 999).getTime(); // 2024年2月29日
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理平年2月（28天）', () => {
    const inputTimestamp = new Date(2023, 1, 15, 12, 0, 0).getTime(); // 2023年2月15日
    const expectedTimestamp = new Date(2023, 1, 28, 23, 59, 59, 999).getTime(); // 2023年2月28日
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理12月份', () => {
    const inputTimestamp = new Date(2024, 11, 15, 10, 30, 0).getTime();
    const expectedTimestamp = new Date(2024, 11, 31, 23, 59, 59, 999).getTime();
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理月末的时间', () => {
    // 输入已经是月末，应该返回当天23:59:59.999
    const inputTimestamp = new Date(2024, 2, 31, 15, 30, 45).getTime(); // 3月31日
    const expectedTimestamp = new Date(2024, 2, 31, 23, 59, 59, 999).getTime();
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理跨年边界', () => {
    const inputTimestamp = new Date(2024, 0, 15, 10, 30, 0).getTime(); // 2024年1月15日
    const expectedTimestamp = new Date(2024, 0, 31, 23, 59, 59, 999).getTime(); // 2024年1月31日
    
    const result = getMonthEndTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });
});

// 月份时间范围综合测试
describe('getMonthStartTimestamp 和 getMonthEndTimestamp 综合测试', () => {
  it('应该确保月初和月末时间戳覆盖整个月', () => {
    const testCases = [
      { year: 2024, month: 0 }, // 1月 (31天)
      { year: 2024, month: 1 }, // 2月闰年 (29天)
      { year: 2023, month: 1 }, // 2月平年 (28天)
      { year: 2024, month: 3 }, // 4月 (30天)
      { year: 2024, month: 6 }, // 7月 (31天)
      { year: 2024, month: 11 }, // 12月 (31天)
    ];

    testCases.forEach(({ year, month }) => {
      const someTimeInMonth = new Date(year, month, 15, 12, 30, 45).getTime();
      
      const monthStart = getMonthStartTimestamp(someTimeInMonth);
      const monthEnd = getMonthEndTimestamp(someTimeInMonth);
      
      // 月初应该在月末之前
      expect(monthStart).toBeLessThan(monthEnd);
      
      // 验证月初是该月第一天的00:00:00
      const startDate = new Date(monthStart);
      expect(startDate.getFullYear()).toBe(year);
      expect(startDate.getMonth()).toBe(month);
      expect(startDate.getDate()).toBe(1);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
      expect(startDate.getMilliseconds()).toBe(0);
      
      // 验证月末是该月最后一天的23:59:59.999
      const endDate = new Date(monthEnd);
      expect(endDate.getFullYear()).toBe(year);
      expect(endDate.getMonth()).toBe(month);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(999);
    });
  });

  it('应该正确处理不同月份的天数', () => {
    const monthDays = [
      { month: 0, days: 31 }, // 1月
      { month: 1, days: 29 }, // 2月（闰年2024）
      { month: 2, days: 31 }, // 3月
      { month: 3, days: 30 }, // 4月
      { month: 4, days: 31 }, // 5月
      { month: 5, days: 30 }, // 6月
      { month: 6, days: 31 }, // 7月
      { month: 7, days: 31 }, // 8月
      { month: 8, days: 30 }, // 9月
      { month: 9, days: 31 }, // 10月
      { month: 10, days: 30 }, // 11月
      { month: 11, days: 31 }, // 12月
    ];

    monthDays.forEach(({ month, days }) => {
      const testTimestamp = new Date(2024, month, 15).getTime();
      const monthEnd = getMonthEndTimestamp(testTimestamp);
      const endDate = new Date(monthEnd);
      
      expect(endDate.getDate()).toBe(days);
    });
  });
});

// ==================== 小时时间戳处理测试 ====================
describe('getHourStartTimestamp', () => {
  it('应该返回小时开始的时间戳', () => {
    // 2024年3月15日 14:30:45.123 -> 2024年3月15日 14:00:00.000
    const inputTimestamp = new Date(2024, 2, 15, 14, 30, 45, 123).getTime();
    const expectedTimestamp = new Date(2024, 2, 15, 14, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理整点时间', () => {
    // 输入已经是整点，应该返回相同的时间戳
    const inputTimestamp = new Date(2024, 2, 15, 10, 0, 0, 0).getTime();
    const expectedTimestamp = new Date(2024, 2, 15, 10, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理午夜时间', () => {
    const inputTimestamp = new Date(2024, 2, 15, 0, 30, 45, 123).getTime();
    const expectedTimestamp = new Date(2024, 2, 15, 0, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理23点的时间', () => {
    const inputTimestamp = new Date(2024, 2, 15, 23, 59, 59, 999).getTime();
    const expectedTimestamp = new Date(2024, 2, 15, 23, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
  });

  it('应该正确处理不同分钟的时间', () => {
    const testCases = [
      { minute: 1 },
      { minute: 15 },
      { minute: 30 },
      { minute: 45 },
      { minute: 59 }
    ];

    testCases.forEach(({ minute }) => {
      const inputTimestamp = new Date(2024, 2, 15, 14, minute, 30, 500).getTime();
      const expectedTimestamp = new Date(2024, 2, 15, 14, 0, 0, 0).getTime();
      
      const result = getHourStartTimestamp(inputTimestamp);
      
      expect(result).toBe(expectedTimestamp);
    });
  });

  it('应该正确处理不同秒数的时间', () => {
    const testCases = [
      { second: 1 },
      { second: 15 },
      { second: 30 },
      { second: 45 },
      { second: 59 }
    ];

    testCases.forEach(({ second }) => {
      const inputTimestamp = new Date(2024, 2, 15, 14, 30, second, 500).getTime();
      const expectedTimestamp = new Date(2024, 2, 15, 14, 0, 0, 0).getTime();
      
      const result = getHourStartTimestamp(inputTimestamp);
      
      expect(result).toBe(expectedTimestamp);
    });
  });

  it('应该正确处理不同毫秒的时间', () => {
    const testCases = [
      { millisecond: 1 },
      { millisecond: 100 },
      { millisecond: 500 },
      { millisecond: 999 }
    ];

    testCases.forEach(({ millisecond }) => {
      const inputTimestamp = new Date(2024, 2, 15, 14, 30, 45, millisecond).getTime();
      const expectedTimestamp = new Date(2024, 2, 15, 14, 0, 0, 0).getTime();
      
      const result = getHourStartTimestamp(inputTimestamp);
      
      expect(result).toBe(expectedTimestamp);
    });
  });

  it('应该正确处理跨天边界的时间', () => {
    // 测试从23:59到次日00:00的情况
    const inputTimestamp = new Date(2024, 2, 15, 23, 59, 59, 999).getTime();
    const expectedTimestamp = new Date(2024, 2, 15, 23, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
    
    // 验证结果确实是23点而不是次日00点
    const resultDate = new Date(result);
    expect(resultDate.getDate()).toBe(15);
    expect(resultDate.getHours()).toBe(23);
  });

  it('应该正确处理月末边界的时间', () => {
    // 3月31日 23:45:30
    const inputTimestamp = new Date(2024, 2, 31, 23, 45, 30, 500).getTime();
    const expectedTimestamp = new Date(2024, 2, 31, 23, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
    
    // 验证日期没有改变
    const resultDate = new Date(result);
    expect(resultDate.getMonth()).toBe(2); // 3月
    expect(resultDate.getDate()).toBe(31);
    expect(resultDate.getHours()).toBe(23);
  });

  it('应该正确处理年末边界的时间', () => {
    // 12月31日 23:45:30
    const inputTimestamp = new Date(2024, 11, 31, 23, 45, 30, 500).getTime();
    const expectedTimestamp = new Date(2024, 11, 31, 23, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
    
    // 验证年份和日期没有改变
    const resultDate = new Date(result);
    expect(resultDate.getFullYear()).toBe(2024);
    expect(resultDate.getMonth()).toBe(11); // 12月
    expect(resultDate.getDate()).toBe(31);
    expect(resultDate.getHours()).toBe(23);
  });

  it('应该正确处理闰年2月29日的时间', () => {
    const inputTimestamp = new Date(2024, 1, 29, 15, 30, 45, 123).getTime();
    const expectedTimestamp = new Date(2024, 1, 29, 15, 0, 0, 0).getTime();
    
    const result = getHourStartTimestamp(inputTimestamp);
    
    expect(result).toBe(expectedTimestamp);
    
    // 验证闰年日期正确处理
    const resultDate = new Date(result);
    expect(resultDate.getFullYear()).toBe(2024);
    expect(resultDate.getMonth()).toBe(1); // 2月
    expect(resultDate.getDate()).toBe(29);
    expect(resultDate.getHours()).toBe(15);
  });

  it('应该正确处理所有24小时的时间', () => {
    for (let hour = 0; hour < 24; hour++) {
      const inputTimestamp = new Date(2024, 2, 15, hour, 30, 45, 123).getTime();
      const expectedTimestamp = new Date(2024, 2, 15, hour, 0, 0, 0).getTime();
      
      const result = getHourStartTimestamp(inputTimestamp);
      
      expect(result).toBe(expectedTimestamp);
      
      // 验证小时数正确
      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(hour);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);
    }
  });

  it('应该确保结果时间戳小于等于输入时间戳', () => {
    const testCases = [
      new Date(2024, 2, 15, 10, 0, 0, 0).getTime(), // 整点时间
      new Date(2024, 2, 15, 10, 30, 45, 123).getTime(), // 普通时间
      new Date(2024, 2, 15, 23, 59, 59, 999).getTime(), // 接近午夜
      new Date(2024, 1, 29, 12, 30, 0, 0).getTime(), // 闰年
    ];

    testCases.forEach(inputTimestamp => {
      const result = getHourStartTimestamp(inputTimestamp);
      
      expect(result).toBeLessThanOrEqual(inputTimestamp);
      
      // 验证结果确实是整点时间
      const resultDate = new Date(result);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);
    });
  });

  it('应该与输入时间在同一小时内', () => {
    const testCases = [
      { year: 2024, month: 2, day: 15, hour: 10, minute: 30, second: 45, ms: 123 },
      { year: 2024, month: 0, day: 1, hour: 0, minute: 59, second: 59, ms: 999 },
      { year: 2024, month: 11, day: 31, hour: 23, minute: 1, second: 1, ms: 1 },
    ];

    testCases.forEach(({ year, month, day, hour, minute, second, ms }) => {
      const inputTimestamp = new Date(year, month, day, hour, minute, second, ms).getTime();
      const result = getHourStartTimestamp(inputTimestamp);
      
      const inputDate = new Date(inputTimestamp);
      const resultDate = new Date(result);
      
      // 验证年、月、日、小时都相同
      expect(resultDate.getFullYear()).toBe(inputDate.getFullYear());
      expect(resultDate.getMonth()).toBe(inputDate.getMonth());
      expect(resultDate.getDate()).toBe(inputDate.getDate());
      expect(resultDate.getHours()).toBe(inputDate.getHours());
      
      // 验证分、秒、毫秒都是0
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);
    });
  });
});

// ==================== 时间字符串解析测试 ====================
describe('parseTimeToTimestamp', () => {
  describe('正常的V2EX时间格式', () => {
    it('应该正确解析标准格式的时间字符串', () => {
      const timeStr = '2024-06-15 09:30:52 +08:00';
      const result = parseTimeToTimestamp(timeStr);
      
      // 验证结果是一个有效的时间戳
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      
      // 验证时间戳对应的UTC日期是否正确
      const date = new Date(result);
      
      // 由于时区转换，我们验证UTC时间
      // 2024-06-15 09:30:52 +08:00 = 2024-06-15 01:30:52 UTC
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(5); // 月份从0开始，6月是5
      expect(date.getUTCDate()).toBe(15);
      expect(date.getUTCHours()).toBe(1); // 09:30 +08:00 = 01:30 UTC
      expect(date.getUTCMinutes()).toBe(30);
      expect(date.getUTCSeconds()).toBe(52);
    });

    it('应该正确处理不同的时区', () => {
      const timeStr1 = '2024-12-25 12:00:00 +08:00'; // 北京时间
      const timeStr2 = '2024-12-25 04:00:00 +00:00'; // UTC时间，应该等价于上面的时间
      
      const result1 = parseTimeToTimestamp(timeStr1);
      const result2 = parseTimeToTimestamp(timeStr2);
      
      expect(result1).toBe(result2);
    });

    it('应该正确处理负时区', () => {
      const timeStr = '2024-06-15 10:30:00 -05:00';
      const result = parseTimeToTimestamp(timeStr);
      
      const date = new Date(result);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // 6月
      expect(date.getDate()).toBe(15);
    });

    it('应该正确处理边界时间', () => {
      const testCases = [
        '2024-01-01 00:00:00 +08:00', // 年初
        '2024-12-31 23:59:59 +08:00', // 年末
        '2024-02-29 12:00:00 +08:00', // 闰年2月29日
        '2023-02-28 12:00:00 +08:00', // 平年2月28日
      ];

      testCases.forEach(timeStr => {
        const result = parseTimeToTimestamp(timeStr);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
        expect(isNaN(result)).toBe(false);
      });
    });
  });

  describe('不同的时间格式', () => {
    it('应该处理没有时区信息的时间字符串', () => {
      const timeStr = '2024-06-15 10:30:00';
      const result = parseTimeToTimestamp(timeStr);
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      
      const date = new Date(result);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(15);
    });

    it('应该处理ISO 8601格式', () => {
      const timeStr = '2024-06-15T10:30:00.000Z';
      const result = parseTimeToTimestamp(timeStr);
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('应该处理不同的时区格式', () => {
      const testCases = [
        '2024-06-15 10:30:00 +0800',    // 没有冒号的时区
        '2024-06-15 10:30:00 GMT+8',    // GMT格式
        '2024-06-15 10:30:00Z',         // Z表示UTC
      ];

      testCases.forEach(timeStr => {
        const result = parseTimeToTimestamp(timeStr);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的时间字符串', () => {
      const invalidTimeStrings = [
        'invalid-date',
        '2024-13-01 10:30:00 +08:00', // 无效月份
        '2024-06-32 10:30:00 +08:00', // 无效日期
        '2024-06-15 25:30:00 +08:00', // 无效小时
        '',                           // 空字符串
        '   ',                        // 只有空格
      ];

      invalidTimeStrings.forEach(timeStr => {
        const result = parseTimeToTimestamp(timeStr);
        
        // 应该返回一个有效的时间戳（当前时间作为兜底）
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
        expect(isNaN(result)).toBe(false);
      });
    });

    it('应该为无效时间返回当前时间戳作为兜底', () => {
      const beforeCall = Date.now();
      const result = parseTimeToTimestamp('invalid-time');
      const afterCall = Date.now();
      
      // 结果应该在调用前后的时间范围内
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it('应该处理null和undefined', () => {
      // @ts-ignore - 测试运行时错误处理
      const resultNull = parseTimeToTimestamp(null);
      // @ts-ignore - 测试运行时错误处理
      const resultUndefined = parseTimeToTimestamp(undefined);
      
      expect(typeof resultNull).toBe('number');
      expect(typeof resultUndefined).toBe('number');
      expect(isNaN(resultNull)).toBe(false);
      expect(isNaN(resultUndefined)).toBe(false);
    });
  });

  describe('时间精度测试', () => {
    it('应该保持毫秒精度', () => {
      const timeStr = '2024-06-15T10:30:45.123Z';
      const result = parseTimeToTimestamp(timeStr);
      
      const date = new Date(result);
      expect(date.getMilliseconds()).toBe(123);
    });

    it('应该正确处理不同的秒精度', () => {
      const testCases = [
        { input: '2024-06-15 10:30:00 +08:00', seconds: 0 },
        { input: '2024-06-15 10:30:30 +08:00', seconds: 30 },
        { input: '2024-06-15 10:30:59 +08:00', seconds: 59 },
      ];

      testCases.forEach(({ input, seconds }) => {
        const result = parseTimeToTimestamp(input);
        const date = new Date(result);
        expect(date.getSeconds()).toBe(seconds);
      });
    });
  });

  describe('实际使用场景测试', () => {
    it('应该正确解析V2EX实际返回的时间格式', () => {
      // 模拟V2EX实际可能返回的时间格式
      const v2exTimeFormats = [
        '2024-01-15 08:30:45 +08:00',
        '2024-12-25 23:59:59 +08:00',
        '2024-06-15 12:00:00 +08:00',
      ];

      v2exTimeFormats.forEach(timeStr => {
        const result = parseTimeToTimestamp(timeStr);
        
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
        expect(isNaN(result)).toBe(false);
        
        // 验证时间戳可以正确转回日期
        const date = new Date(result);
        expect(date.getFullYear()).toBeGreaterThanOrEqual(2024);
      });
    });

    it('应该与原生Date.parse()结果一致', () => {
      const timeStr = '2024-06-15 10:30:00 +08:00';
      const ourResult = parseTimeToTimestamp(timeStr);
      const nativeResult = Date.parse(timeStr);
      
      expect(ourResult).toBe(nativeResult);
    });
  });
}); 