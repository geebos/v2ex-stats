// 度量处理器函数类型
export type MetricHandler = (name: string, enabled: boolean) => void;

// 功能启用判断函数类型
export type EnableFn = <T>(config: T) => boolean;
// 选项处理函数类型
export type OptionsFn = <T>(config: T) => T;

// 无参数入口点函数类型
export type Entrypoint = () => void;
// 带选项参数的入口点函数类型
export type EntrypointWithOptions = <T>(options: T) => void;

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
  public emitMetric(name: string, enabled: boolean) {
    for (const [_, metricHandler] of Object.entries(this.metricHandlers)) {
      metricHandler(name, enabled);
    }
  }

  // 定义功能的重载方法签名
  public feature(name: string, enable: EnableFn, entrypoint: Entrypoint): () => void;
  public feature(name: string, enable: EnableFn, options: OptionsFn, entrypoint: EntrypointWithOptions): () => void;

  // 功能定义的实现方法
  public feature(name: string, enable: EnableFn, optionsFnOrEntrypoint: OptionsFn | Entrypoint, entrypointWithOptions?: EntrypointWithOptions) {
    return () => {
      // 检查功能是否启用
      if (!enable(this.config)) {
        this.emitMetric(name, false);
        return;
      }

      // 根据参数类型执行不同的入口点
      if (entrypointWithOptions) {
        entrypointWithOptions(optionsFnOrEntrypoint(this.config));
      } else {
        (optionsFnOrEntrypoint as Entrypoint)();
      }

      this.emitMetric(name, true);
    }
  }
} 