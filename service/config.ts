import { storage } from "@wxt-dev/storage";
import { ConfigOptions, defaultConfig } from "../types/types";

const CONFIG_KEY = "local:config";

// 获取配置
export const getConfig = async (): Promise<ConfigOptions> => {
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
  const currentConfig = await getConfig();
  const newConfig: ConfigOptions = {
    coinStats: { ...currentConfig.coinStats, ...partialConfig.coinStats },
    activityTime: { ...currentConfig.activityTime, ...partialConfig.activityTime },
    postBrowsing: { ...currentConfig.postBrowsing, ...partialConfig.postBrowsing },
  };
  await setConfig(newConfig);
};

// 重置为默认配置
export const resetConfig = async (): Promise<void> => {
  await setConfig(defaultConfig);
};

export const isCoinStatsEnabled = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.coinStats.enabled;
};

export const isActivityTimeEnabled = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.activityTime.enableStats;
};

export const isActivityTimeShowInStatusBar = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.activityTime.enableStats && config.activityTime.showInStatusBar;
};

export const isActivityTimeShowDetailInProfile = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.activityTime.enableStats && config.activityTime.showDetailInProfile;
};

export const isPostBrowsingShowNewComments = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.postBrowsing.showNewComments;
};

export const isPostBrowsingHighlightNewComments = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.postBrowsing.highlightNewComments;
};

export const isPostBrowsingAutoScrollToFirstNewComment = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.postBrowsing.autoScrollToFirstNewComment;
};

export const isPostBrowsingSmoothScrolling = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.postBrowsing.smoothScrolling;
};

export const isPostBrowsingMarkNewPosts = async (): Promise<boolean> => {
  const config = await getConfig();
  return config.postBrowsing.markNewPosts;
};