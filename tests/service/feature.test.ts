import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  FeatureManager, 
  type MetricHandler, 
  type EnableFn, 
  type OptionsFn, 
  type Entrypoint, 
  type EntrypointWithOptions 
} from '../../service/feature';

// 测试配置类型
interface TestConfig {
  enabled: boolean;
  feature1: boolean;
  feature2: boolean;
  options: {
    theme: string;
    version: number;
  };
}

describe('FeatureManager', () => {
  let featureManager: FeatureManager<TestConfig>;
  let testConfig: TestConfig;

  beforeEach(() => {
    testConfig = {
      enabled: true,
      feature1: true,
      feature2: false,
      options: {
        theme: 'dark',
        version: 1
      }
    };
    featureManager = new FeatureManager(testConfig);
    vi.clearAllMocks();
  });

  // ==================== 构造函数测试 ====================
  describe('constructor', () => {
    it('应该正确初始化配置', () => {
      const config = { test: true };
      const manager = new FeatureManager(config);
      
      expect(manager).toBeInstanceOf(FeatureManager);
    });

    it('应该初始化空的度量处理器集合', () => {
      const manager = new FeatureManager({});
      
      // 通过注册处理器来验证初始状态
      const handler = vi.fn();
      manager.registerMetricHandler('test', handler);
      manager.emitMetric('test', true);
      
      expect(handler).toHaveBeenCalledWith('test', true);
    });
  });

  // ==================== registerMetricHandler 测试 ====================
  describe('registerMetricHandler', () => {
    it('应该成功注册度量处理器', () => {
      const handler = vi.fn();
      
      expect(() => {
        featureManager.registerMetricHandler('testHandler', handler);
      }).not.toThrow();
      
      // 验证处理器已注册
      featureManager.emitMetric('test', true);
      expect(handler).toHaveBeenCalledWith('test', true);
    });

    it('应该能注册多个不同名称的处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      featureManager.registerMetricHandler('handler1', handler1);
      featureManager.registerMetricHandler('handler2', handler2);
      
      featureManager.emitMetric('test', true);
      
      expect(handler1).toHaveBeenCalledWith('test', true);
      expect(handler2).toHaveBeenCalledWith('test', true);
    });

    it('应该在重复注册同名处理器时抛出错误', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      featureManager.registerMetricHandler('duplicate', handler1);
      
      expect(() => {
        featureManager.registerMetricHandler('duplicate', handler2);
      }).toThrow('Metric handler for duplicate already registered');
    });

    it('应该允许注册相同函数但不同名称', () => {
      const handler = vi.fn();
      
      expect(() => {
        featureManager.registerMetricHandler('name1', handler);
        featureManager.registerMetricHandler('name2', handler);
      }).not.toThrow();
    });
  });

  // ==================== emitMetric 测试 ====================
  describe('emitMetric', () => {
    it('应该在没有注册处理器时不报错', () => {
      expect(() => {
        featureManager.emitMetric('test', true);
      }).not.toThrow();
    });

    it('应该调用单个注册的处理器', () => {
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      featureManager.emitMetric('feature1', true);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('feature1', true);
    });

    it('应该调用所有注册的处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      featureManager.registerMetricHandler('h1', handler1);
      featureManager.registerMetricHandler('h2', handler2);
      featureManager.registerMetricHandler('h3', handler3);
      
      featureManager.emitMetric('feature2', false);
      
      expect(handler1).toHaveBeenCalledWith('feature2', false);
      expect(handler2).toHaveBeenCalledWith('feature2', false);
      expect(handler3).toHaveBeenCalledWith('feature2', false);
    });

    it('应该正确传递参数给所有处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      featureManager.registerMetricHandler('h1', handler1);
      featureManager.registerMetricHandler('h2', handler2);
      
      featureManager.emitMetric('testFeature', true);
      featureManager.emitMetric('anotherFeature', false);
      
      expect(handler1).toHaveBeenNthCalledWith(1, 'testFeature', true);
      expect(handler1).toHaveBeenNthCalledWith(2, 'anotherFeature', false);
      expect(handler2).toHaveBeenNthCalledWith(1, 'testFeature', true);
      expect(handler2).toHaveBeenNthCalledWith(2, 'anotherFeature', false);
    });

    it('应该处理处理器执行时的异常', () => {
      const goodHandler = vi.fn();
      const badHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      featureManager.registerMetricHandler('good', goodHandler);
      featureManager.registerMetricHandler('bad', badHandler);
      
      // 即使有处理器抛出异常，也应该继续执行其他处理器
      expect(() => {
        featureManager.emitMetric('test', true);
      }).toThrow('Handler error');
      
      expect(goodHandler).toHaveBeenCalledWith('test', true);
      expect(badHandler).toHaveBeenCalledWith('test', true);
    });
  });

  // ==================== feature 方法测试 ====================
  describe('feature - 简单形式 (name, enable, entrypoint)', () => {
    it('应该在功能启用时执行入口点并发送启用事件', () => {
      const entrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature1) as EnableFn;
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      
      featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('testFeature', true);
    });

    it('应该在功能禁用时不执行入口点但发送禁用事件', () => {
      const entrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature2) as EnableFn; // feature2 为 false
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      
      featureRunner();
      
      expect(entrypoint).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('testFeature', false);
    });

    it('应该将配置传递给启用检查函数', () => {
      const entrypoint = vi.fn();
      const enableFn = vi.fn((config: TestConfig) => config.enabled) as EnableFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      featureRunner();
      
      expect(enableFn).toHaveBeenCalledWith(testConfig);
    });

    it('应该返回可重复执行的函数', () => {
      const entrypoint = vi.fn();
      const enableFn = ((config: TestConfig) => config.enabled) as EnableFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      
      featureRunner();
      featureRunner();
      featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(3);
    });
  });

  describe('feature - 带选项形式 (name, enable, options, entrypoint)', () => {
    it('应该在功能启用时执行带选项的入口点', () => {
      const entrypointWithOptions = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature1) as EnableFn;
      const optionsFn = ((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      featureRunner();
      
      expect(entrypointWithOptions).toHaveBeenCalledTimes(1);
      expect(entrypointWithOptions).toHaveBeenCalledWith(testConfig.options);
      expect(handler).toHaveBeenCalledWith('testFeature', true);
    });

    it('应该在功能禁用时不执行入口点', () => {
      const entrypointWithOptions = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature2) as EnableFn; // feature2 为 false
      const optionsFn = ((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      featureRunner();
      
      expect(entrypointWithOptions).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('testFeature', false);
    });

    it('应该将配置传递给选项处理函数', () => {
      const entrypointWithOptions = vi.fn();
      const enableFn = ((config: TestConfig) => config.enabled) as EnableFn;
      const optionsFn = vi.fn((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      featureRunner();
      
      expect(optionsFn).toHaveBeenCalledWith(testConfig);
    });

    it('应该将选项处理函数的结果传递给入口点', () => {
      const entrypointWithOptions = vi.fn();
      const processedOptions = { theme: 'light', version: 2 };
      
      const enableFn = ((config: TestConfig) => config.enabled) as EnableFn;
      const optionsFn = (() => processedOptions) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      featureRunner();
      
      expect(entrypointWithOptions).toHaveBeenCalledWith(processedOptions);
    });
  });

  // ==================== 综合测试 ====================
  describe('feature - 综合场景测试', () => {
    it('应该支持动态启用/禁用功能', () => {
      const entrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      let dynamicEnabled = true;
      const enableFn = (() => dynamicEnabled) as EnableFn;
      
      const featureRunner = featureManager.feature('dynamicFeature', enableFn, entrypoint);
      
      // 首次执行 - 启用
      featureRunner();
      expect(entrypoint).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenLastCalledWith('dynamicFeature', true);
      
      // 禁用功能
      dynamicEnabled = false;
      featureRunner();
      expect(entrypoint).toHaveBeenCalledTimes(1); // 不应再次调用
      expect(handler).toHaveBeenLastCalledWith('dynamicFeature', false);
      
      // 重新启用功能
      dynamicEnabled = true;
      featureRunner();
      expect(entrypoint).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenLastCalledWith('dynamicFeature', true);
    });

    it('应该处理复杂的配置对象', () => {
      interface ComplexConfig {
        features: {
          auth: { enabled: boolean; provider: string };
          ui: { theme: string; animations: boolean };
        };
        environment: 'dev' | 'prod';
      }
      
      const complexConfig: ComplexConfig = {
        features: {
          auth: { enabled: true, provider: 'oauth' },
          ui: { theme: 'dark', animations: true }
        },
        environment: 'prod'
      };
      
      const complexManager = new FeatureManager(complexConfig);
      const entrypoint = vi.fn();
      
      const enableFn = ((config: ComplexConfig) => 
        config.features.auth.enabled && config.environment === 'prod') as EnableFn;
      
      const featureRunner = complexManager.feature('authFeature', enableFn, entrypoint);
      featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(1);
    });

    it('应该处理入口点执行时的异常', () => {
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const errorEntrypoint = vi.fn(() => {
        throw new Error('Entrypoint error');
      });
      
      const enableFn = (() => true) as EnableFn;
      const featureRunner = featureManager.feature('errorFeature', enableFn, errorEntrypoint);
      
      expect(() => {
        featureRunner();
      }).toThrow('Entrypoint error');
      
      // 验证入口点被调用了，但由于异常，不会发送启用事件
      expect(errorEntrypoint).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
    });

    it('应该允许多个功能使用相同的处理器', () => {
      const handler = vi.fn();
      featureManager.registerMetricHandler('global', handler);
      
      const entrypoint1 = vi.fn();
      const entrypoint2 = vi.fn();
      
      const enableFn = (() => true) as EnableFn;
      
      const feature1Runner = featureManager.feature('feature1', enableFn, entrypoint1);
      const feature2Runner = featureManager.feature('feature2', enableFn, entrypoint2);
      
      feature1Runner();
      feature2Runner();
      
      expect(handler).toHaveBeenCalledWith('feature1', true);
      expect(handler).toHaveBeenCalledWith('feature2', true);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('应该处理空配置对象', () => {
      const emptyManager = new FeatureManager({});
      const entrypoint = vi.fn();
      
      const enableFn = (() => true) as EnableFn;
      const featureRunner = emptyManager.feature('emptyConfigFeature', enableFn, entrypoint);
      
      expect(() => {
        featureRunner();
      }).not.toThrow();
      
      expect(entrypoint).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 边界情况测试 ====================
  describe('边界情况和错误处理', () => {
    it('应该处理null/undefined配置', () => {
      const nullManager = new FeatureManager(null);
      const entrypoint = vi.fn();
      
      const enableFn = ((config) => config !== null) as EnableFn;
      const featureRunner = nullManager.feature('nullTest', enableFn, entrypoint);
      
      featureRunner();
      
      expect(entrypoint).not.toHaveBeenCalled();
    });

    it('应该处理启用函数返回非布尔值', () => {
      const entrypoint = vi.fn();
      
      const enableFn = vi.fn(() => 'truthy' as any) as EnableFn; // 返回非布尔值
      const featureRunner = featureManager.feature('truthyTest', enableFn, entrypoint);
      
      featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(1); // JavaScript的truthy值应该被当作true
    });

    it('应该处理选项函数返回undefined', () => {
      const entrypointWithOptions = vi.fn();
      
      const enableFn = (() => true) as EnableFn;
      const optionsFn = (() => undefined as any) as OptionsFn;
      
      const featureRunner = featureManager.feature('undefinedOptions', enableFn, optionsFn, entrypointWithOptions);
      featureRunner();
      
      expect(entrypointWithOptions).toHaveBeenCalledWith(undefined);
    });
  });
});