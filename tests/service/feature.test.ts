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

    it('应该初始化空的度量处理器集合', async () => {
      const manager = new FeatureManager({});
      
      // 通过注册处理器来验证初始状态
      const handler = vi.fn();
      manager.registerMetricHandler('test', handler);
      await manager.emitMetric('test', true);
      
      expect(handler).toHaveBeenCalledWith('test', true);
    });
  });

  // ==================== registerMetricHandler 测试 ====================
  describe('registerMetricHandler', () => {
    it('应该成功注册度量处理器', async () => {
      const handler = vi.fn();
      
      expect(() => {
        featureManager.registerMetricHandler('testHandler', handler);
      }).not.toThrow();
      
      // 验证处理器已注册
      await featureManager.emitMetric('test', true);
      expect(handler).toHaveBeenCalledWith('test', true);
    });

    it('应该能注册多个不同名称的处理器', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      featureManager.registerMetricHandler('handler1', handler1);
      featureManager.registerMetricHandler('handler2', handler2);
      
      await featureManager.emitMetric('test', true);
      
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
    it('应该在没有注册处理器时不报错', async () => {
      await expect(
        featureManager.emitMetric('test', true)
      ).resolves.not.toThrow();
    });

    it('应该调用单个注册的处理器', async () => {
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      await featureManager.emitMetric('feature1', true);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('feature1', true);
    });

    it('应该调用所有注册的处理器', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      featureManager.registerMetricHandler('h1', handler1);
      featureManager.registerMetricHandler('h2', handler2);
      featureManager.registerMetricHandler('h3', handler3);
      
      await featureManager.emitMetric('feature2', false);
      
      expect(handler1).toHaveBeenCalledWith('feature2', false);
      expect(handler2).toHaveBeenCalledWith('feature2', false);
      expect(handler3).toHaveBeenCalledWith('feature2', false);
    });

    it('应该正确传递参数给所有处理器', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      featureManager.registerMetricHandler('h1', handler1);
      featureManager.registerMetricHandler('h2', handler2);
      
      await featureManager.emitMetric('testFeature', true);
      await featureManager.emitMetric('anotherFeature', false);
      
      expect(handler1).toHaveBeenNthCalledWith(1, 'testFeature', true);
      expect(handler1).toHaveBeenNthCalledWith(2, 'anotherFeature', false);
      expect(handler2).toHaveBeenNthCalledWith(1, 'testFeature', true);
      expect(handler2).toHaveBeenNthCalledWith(2, 'anotherFeature', false);
    });

    it('应该处理处理器执行时的异常', async () => {
      const goodHandler = vi.fn();
      const badHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      // 模拟 console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      featureManager.registerMetricHandler('good', goodHandler);
      featureManager.registerMetricHandler('bad', badHandler);
      
      // 即使有处理器抛出异常，emitMetric 也不应该抛出异常
      await expect(
        featureManager.emitMetric('test', true)
      ).resolves.not.toThrow();
      
      // 验证所有处理器都被调用了
      expect(goodHandler).toHaveBeenCalledWith('test', true);
      expect(badHandler).toHaveBeenCalledWith('test', true);
      
      // 验证错误被记录到控制台
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'MetricHandler "bad" failed for metric "test":',
        expect.any(Error)
      );
      
      // 清理模拟
      consoleErrorSpy.mockRestore();
    });
  });

  // ==================== feature 方法测试 ====================
  describe('feature - 简单形式 (name, enable, entrypoint)', () => {
    it('应该在功能启用时执行入口点并发送启用事件', async () => {
      const entrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature1) as EnableFn;
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      
      await featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('testFeature', true);
    });

    it('应该在功能禁用时不执行入口点但发送禁用事件', async () => {
      const entrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature2) as EnableFn; // feature2 为 false
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      
      await featureRunner();
      
      expect(entrypoint).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('testFeature', false);
    });

    it('应该将配置传递给启用检查函数', async () => {
      const entrypoint = vi.fn();
      const enableFn = vi.fn((config: TestConfig) => config.enabled) as EnableFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      await featureRunner();
      
      expect(enableFn).toHaveBeenCalledWith(testConfig);
    });

    it('应该返回可重复执行的函数', async () => {
      const entrypoint = vi.fn();
      const enableFn = ((config: TestConfig) => config.enabled) as EnableFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, entrypoint);
      
      await featureRunner();
      await featureRunner();
      await featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(3);
    });
  });

  describe('feature - 带选项形式 (name, enable, options, entrypoint)', () => {
    it('应该在功能启用时执行带选项的入口点', async () => {
      const entrypointWithOptions = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature1) as EnableFn;
      const optionsFn = ((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      await featureRunner();
      
      expect(entrypointWithOptions).toHaveBeenCalledTimes(1);
      expect(entrypointWithOptions).toHaveBeenCalledWith(testConfig.options);
      expect(handler).toHaveBeenCalledWith('testFeature', true);
    });

    it('应该在功能禁用时不执行入口点', async () => {
      const entrypointWithOptions = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const enableFn = ((config: TestConfig) => config.feature2) as EnableFn; // feature2 为 false
      const optionsFn = ((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      await featureRunner();
      
      expect(entrypointWithOptions).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('testFeature', false);
    });

    it('应该将配置传递给选项处理函数', async () => {
      const entrypointWithOptions = vi.fn();
      const enableFn = ((config: TestConfig) => config.enabled) as EnableFn;
      const optionsFn = vi.fn((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      await featureRunner();
      
      expect(optionsFn).toHaveBeenCalledWith(testConfig);
    });

    it('应该将选项处理函数的结果传递给入口点', async () => {
      const entrypointWithOptions = vi.fn();
      const processedOptions = { theme: 'light', version: 2 };
      
      const enableFn = ((config: TestConfig) => config.enabled) as EnableFn;
      const optionsFn = (() => processedOptions) as OptionsFn;
      
      const featureRunner = featureManager.feature('testFeature', enableFn, optionsFn, entrypointWithOptions);
      await featureRunner();
      
      expect(entrypointWithOptions).toHaveBeenCalledWith(processedOptions);
    });
  });

  // ==================== 综合测试 ====================
  describe('feature - 综合场景测试', () => {
    it('应该支持动态启用/禁用功能', async () => {
      const entrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      let dynamicEnabled = true;
      const enableFn = (() => dynamicEnabled) as EnableFn;
      
      const featureRunner = featureManager.feature('dynamicFeature', enableFn, entrypoint);
      
      // 首次执行 - 启用
      await featureRunner();
      expect(entrypoint).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenLastCalledWith('dynamicFeature', true);
      
      // 禁用功能
      dynamicEnabled = false;
      await featureRunner();
      expect(entrypoint).toHaveBeenCalledTimes(1); // 不应再次调用
      expect(handler).toHaveBeenLastCalledWith('dynamicFeature', false);
      
      // 重新启用功能
      dynamicEnabled = true;
      await featureRunner();
      expect(entrypoint).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenLastCalledWith('dynamicFeature', true);
    });

    it('应该处理复杂的配置对象', async () => {
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
      await featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(1);
    });

    it('应该处理入口点执行时的异常', async () => {
      const handler = vi.fn();
      featureManager.registerMetricHandler('test', handler);
      
      const errorEntrypoint = vi.fn(() => {
        throw new Error('Entrypoint error');
      });
      
      const enableFn = (() => true) as EnableFn;
      const featureRunner = featureManager.feature('errorFeature', enableFn, errorEntrypoint);
      
      await expect(
        featureRunner()
      ).rejects.toThrow('Entrypoint error');
      
      // 验证入口点被调用了，但由于异常，不会发送启用事件
      expect(errorEntrypoint).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
    });

    it('应该允许多个功能使用相同的处理器', async () => {
      const handler = vi.fn();
      featureManager.registerMetricHandler('global', handler);
      
      const entrypoint1 = vi.fn();
      const entrypoint2 = vi.fn();
      
      const enableFn = (() => true) as EnableFn;
      
      const feature1Runner = featureManager.feature('feature1', enableFn, entrypoint1);
      const feature2Runner = featureManager.feature('feature2', enableFn, entrypoint2);
      
      await feature1Runner();
      await feature2Runner();
      
      expect(handler).toHaveBeenCalledWith('feature1', true);
      expect(handler).toHaveBeenCalledWith('feature2', true);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('应该处理空配置对象', async () => {
      const emptyManager = new FeatureManager({});
      const entrypoint = vi.fn();
      
      const enableFn = (() => true) as EnableFn;
      const featureRunner = emptyManager.feature('emptyConfigFeature', enableFn, entrypoint);
      
      await expect(
        featureRunner()
      ).resolves.not.toThrow();
      
      expect(entrypoint).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 异步功能测试 ====================
  describe('异步功能支持', () => {
    it('应该支持异步的 MetricHandler', async () => {
      let asyncHandlerCalled = false;
      const asyncHandler = async (name: string, enabled: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncHandlerCalled = true;
      };
      
      featureManager.registerMetricHandler('async', asyncHandler);
      await featureManager.emitMetric('test', true);
      
      expect(asyncHandlerCalled).toBe(true);
    });

    it('应该支持异步的 EnableFn', async () => {
      let asyncEnableCalled = false;
      const entrypoint = vi.fn();
      
      const asyncEnableFn = (async (config: TestConfig) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncEnableCalled = true;
        return config.feature1;
      }) as EnableFn;
      
      const featureRunner = featureManager.feature('asyncEnable', asyncEnableFn, entrypoint);
      await featureRunner();
      
      expect(asyncEnableCalled).toBe(true);
      expect(entrypoint).toHaveBeenCalledTimes(1);
    });

    it('应该支持异步的 OptionsFn', async () => {
      let asyncOptionsCalled = false;
      const entrypointWithOptions = vi.fn();
      
      const enableFn = () => true;
      const asyncOptionsFn = (async (config: TestConfig) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncOptionsCalled = true;
        return { ...config.options, theme: 'light' };
      }) as OptionsFn;
      
      const featureRunner = featureManager.feature('asyncOptions', enableFn, asyncOptionsFn, entrypointWithOptions);
      await featureRunner();
      
      expect(asyncOptionsCalled).toBe(true);
      expect(entrypointWithOptions).toHaveBeenCalledWith({ theme: 'light', version: 1 });
    });

    it('应该支持异步的 Entrypoint', async () => {
      let asyncEntrypointCalled = false;
      
      const asyncEntrypoint = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncEntrypointCalled = true;
      };
      
      const enableFn = () => true;
      const featureRunner = featureManager.feature('asyncEntrypoint', enableFn, asyncEntrypoint);
      await featureRunner();
      
      expect(asyncEntrypointCalled).toBe(true);
    });

    it('应该支持异步的 EntrypointWithOptions', async () => {
      let asyncEntrypointWithOptionsCalled = false;
      let receivedOptions = null;
      
      const asyncEntrypointWithOptions = async (options: any) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        asyncEntrypointWithOptionsCalled = true;
        receivedOptions = options;
      };
      
      const enableFn = () => true;
      const optionsFn = ((config: TestConfig) => config.options) as OptionsFn;
      
      const featureRunner = featureManager.feature('asyncEntrypointWithOptions', enableFn, optionsFn, asyncEntrypointWithOptions);
      await featureRunner();
      
      expect(asyncEntrypointWithOptionsCalled).toBe(true);
      expect(receivedOptions).toEqual(testConfig.options);
    });

    it('应该正确处理混合的同步和异步函数', async () => {
      const syncEntrypoint = vi.fn();
      const handler = vi.fn();
      featureManager.registerMetricHandler('mixed', handler);
      
      const asyncEnableFn = (async (config: TestConfig) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return config.feature1;
      }) as EnableFn;
      
      const featureRunner = featureManager.feature('mixedSync', asyncEnableFn, syncEntrypoint);
      await featureRunner();
      
      expect(syncEntrypoint).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('mixedSync', true);
    });

    it('应该正确处理异步 MetricHandler 的异常', async () => {
      const goodAsyncHandler = vi.fn(async (name: string, enabled: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });
      
      const badAsyncHandler = vi.fn(async (name: string, enabled: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        throw new Error('Async handler error');
      });
      
      // 模拟 console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      featureManager.registerMetricHandler('goodAsync', goodAsyncHandler);
      featureManager.registerMetricHandler('badAsync', badAsyncHandler);
      
      // 即使异步处理器抛出异常，emitMetric 也不应该抛出异常
      await expect(
        featureManager.emitMetric('asyncTest', true)
      ).resolves.not.toThrow();
      
      // 验证所有处理器都被调用了
      expect(goodAsyncHandler).toHaveBeenCalledWith('asyncTest', true);
      expect(badAsyncHandler).toHaveBeenCalledWith('asyncTest', true);
      
      // 验证错误被记录到控制台
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'MetricHandler "badAsync" failed for metric "asyncTest":',
        expect.any(Error)
      );
      
      // 清理模拟
      consoleErrorSpy.mockRestore();
    });
  });

  // ==================== 边界情况测试 ====================
  describe('边界情况和错误处理', () => {
    it('应该处理null/undefined配置', async () => {
      const nullManager = new FeatureManager(null);
      const entrypoint = vi.fn();
      
      const enableFn = ((config) => config !== null) as EnableFn;
      const featureRunner = nullManager.feature('nullTest', enableFn, entrypoint);
      
      await featureRunner();
      
      expect(entrypoint).not.toHaveBeenCalled();
    });

    it('应该处理启用函数返回非布尔值', async () => {
      const entrypoint = vi.fn();
      
      const enableFn = vi.fn(() => 'truthy' as any) as EnableFn; // 返回非布尔值
      const featureRunner = featureManager.feature('truthyTest', enableFn, entrypoint);
      
      await featureRunner();
      
      expect(entrypoint).toHaveBeenCalledTimes(1); // JavaScript的truthy值应该被当作true
    });

    it('应该处理选项函数返回undefined', async () => {
      const entrypointWithOptions = vi.fn();
      
      const enableFn = (() => true) as EnableFn;
      const optionsFn = (() => undefined as any) as OptionsFn;
      
      const featureRunner = featureManager.feature('undefinedOptions', enableFn, optionsFn, entrypointWithOptions);
      await featureRunner();
      
      expect(entrypointWithOptions).toHaveBeenCalledWith(undefined);
    });
  });
});