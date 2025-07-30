// 度量处理器函数类型
export type MetricHandler = (name: string, enabled: boolean) => void | Promise<void>;

// 功能启用判断函数类型
export type EnableFn = <T>(config: T) => boolean | Promise<boolean>;
// 选项处理函数类型
export type OptionsFn = <T>(config: T) => T | Promise<T>;

// 无参数入口点函数类型
export type Entrypoint = () => void | Promise<void>;
// 带选项参数的入口点函数类型
export type EntrypointWithOptions = <T>(options: T) => void | Promise<void>;

// 功能管理器类
export class FeatureManager<T> {
  private config: T;
  private metricHandlers: Record<string, MetricHandler> = {};

  constructor(config: T) {
    this.config = config;
  }

  // 注册打点处理器
  public registerMetricHandler(name: string, handler: MetricHandler) {
    if (this.metricHandlers[name]) {
      throw new Error(`Metric handler for ${name} already registered`);
    }
    this.metricHandlers[name] = handler;
  }
  
  // 触发打点事件
  public async emitMetric(name: string, enabled: boolean) {
    const promises = Object.entries(this.metricHandlers).map(async ([handlerName, handler]) => {
      try {
        await Promise.resolve(handler(name, enabled));
      } catch (error) {
        console.error(`MetricHandler "${handlerName}" failed for metric "${name}":`, error);
      }
    });
    await Promise.all(promises);
  }

  // 定义功能的重载方法签名
  public feature(name: string, enable: EnableFn, entrypoint: Entrypoint): () => Promise<void>;
  public feature(name: string, enable: EnableFn, options: OptionsFn, entrypoint: EntrypointWithOptions): () => Promise<void>;

  // 功能定义的实现方法
  public feature(name: string, enable: EnableFn, optionsFnOrEntrypoint: OptionsFn | Entrypoint, entrypointWithOptions?: EntrypointWithOptions) {
    return async () => {
      // 检查功能是否启用
      const isEnabled = await Promise.resolve(enable(this.config));
      if (!isEnabled) {
        await this.emitMetric(name, false);
        return;
      }

      // 根据参数类型执行不同的入口点
      if (entrypointWithOptions) {
        const options = await Promise.resolve((optionsFnOrEntrypoint as OptionsFn)(this.config));
        await Promise.resolve(entrypointWithOptions(options));
      } else {
        await Promise.resolve((optionsFnOrEntrypoint as Entrypoint)());
      }

      await this.emitMetric(name, true);
    }
  }
} 