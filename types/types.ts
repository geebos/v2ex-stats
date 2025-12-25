export interface BalanceRecord {
  timestamp: number;
  type: BRTypeEnum | string;
  delta: number;
  balance: number;
  username: string;
}

export interface PageInfo {
  isV2ex: boolean;
  isLoggedIn: boolean;
  username: string;
  pathname: string;
}

export interface BalanceRecordQuery {
  username: string;
  granularity: Granularity;
  aggType: AggType;
  recordType: RecordType;
  start: number;
  end: number;
}

export interface BalanceRecordType {
  id: number;
  value: BRTypeEnum | string;
}

// 余额记录类型常量
export const BRTypeUploadImage = "上传图片" as const;
export const BRTypeManualRecharge = "手工充值" as const;
export const BRTypeInitialCapital = "初始资本" as const;
export const BRTypeDailyActivity = "每日活跃度奖励" as const;
export const BRTypeDailyLogin = "每日登录奖励" as const;
export const BRTypeTopicReplyIncome = "主题回复收益" as const;
export const BRTypeCreateReply = "创建回复" as const;
export const BRTypeConsecutiveLogin = "连续登录奖励" as const;
export const BRTypeCreateTopic = "创建主题" as const;
export const BRTypeSendThanks = "发送谢意" as const;
export const BRTypeCreateAppendix = "创建主题附言" as const;
export const BRTypeEditTopic = "编辑主题" as const;
export const BRTypeReceiveThanks = "收到谢意" as const;

// 余额记录类型枚举
export type BRTypeEnum =
  | typeof BRTypeUploadImage
  | typeof BRTypeManualRecharge
  | typeof BRTypeInitialCapital
  | typeof BRTypeDailyActivity
  | typeof BRTypeDailyLogin
  | typeof BRTypeTopicReplyIncome
  | typeof BRTypeCreateReply
  | typeof BRTypeConsecutiveLogin
  | typeof BRTypeCreateTopic
  | typeof BRTypeSendThanks
  | typeof BRTypeCreateAppendix
  | typeof BRTypeEditTopic
  | typeof BRTypeReceiveThanks;

export type CompactBalanceRecord = [number, number, number, number];

export type Granularity = 'minute' | 'hour' | 'day' | 'month' | 'year';

export type AggType = 'agg_time' | 'agg_type';

export type RecordType = 'all' | 'income' | 'expense';

export interface UsedTimeRecord {
  timestamp: number;
  seconds: number;
}

// 配置选项接口
export interface ConfigOptions {
  // 金币统计
  coinStats: {
    enabled: boolean;
  };

  // 活动时间
  activityTime: {
    enableStats: boolean;
    showInStatusBar: boolean;
    showDetailInProfile: boolean;
  };

  // 帖子浏览
  postBrowsing: {
    showNewComments: boolean;
    highlightNewComments: boolean;
    autoScrollToFirstNewComment: boolean;
    smoothScrolling: boolean;
    markNewPosts: boolean;
  };

  // 界面设置
  ui: {
    showIgnoreUpdateConfig: boolean;
  };
}

// 默认配置
export const defaultConfig: ConfigOptions = {
  coinStats: {
    enabled: true,
  },
  activityTime: {
    enableStats: false,
    showInStatusBar: false,
    showDetailInProfile: false,
  },
  postBrowsing: {
    showNewComments: false,
    highlightNewComments: false,
    autoScrollToFirstNewComment: false,
    smoothScrolling: false,
    markNewPosts: false,
  },
  ui: {
    showIgnoreUpdateConfig: false,
  },
};