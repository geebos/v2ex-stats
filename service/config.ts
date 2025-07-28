import { storage } from "@wxt-dev/storage";
import { ConfigOptions, defaultConfig } from "../types/types";

const CONFIG_KEY = "local:config";

// 获取配置
export const getConfig = async (): Promise<ConfigOptions> => {
  try {
    const config = await storage.getItem<ConfigOptions>(CONFIG_KEY);
    // 如果没有配置，返回默认配置
    if (!config) {
      await setConfig(defaultConfig);
      return defaultConfig;
    }
    
    // 合并默认配置和用户配置，确保新增的配置项有默认值
    return {
      coinStats: { ...defaultConfig.coinStats, ...config.coinStats },
      activityTime: { ...defaultConfig.activityTime, ...config.activityTime },
      postBrowsing: { ...defaultConfig.postBrowsing, ...config.postBrowsing },
    };
  } catch (error) {
    console.error('获取配置失败:', error);
    return defaultConfig;
  }
};

// 设置配置
export const setConfig = async (config: ConfigOptions): Promise<void> => {
  try {
    await storage.setItem(CONFIG_KEY, config);
  } catch (error) {
    console.error('保存配置失败:', error);
  }
};

// 更新部分配置
export const updateConfig = async (partialConfig: Partial<ConfigOptions>): Promise<void> => {
  try {
    const currentConfig = await getConfig();
    const newConfig: ConfigOptions = {
      coinStats: { ...currentConfig.coinStats, ...partialConfig.coinStats },
      activityTime: { ...currentConfig.activityTime, ...partialConfig.activityTime },
      postBrowsing: { ...currentConfig.postBrowsing, ...partialConfig.postBrowsing },
    };
    await setConfig(newConfig);
  } catch (error) {
    console.error('更新配置失败:', error);
  }
};

// 重置为默认配置
export const resetConfig = async (): Promise<void> => {
  await setConfig(defaultConfig);
};