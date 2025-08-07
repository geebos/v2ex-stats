export interface BalanceRecord {
  timestamp: number;
  type: string;
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
  value: string;
}

export type CompactBalanceRecord = [number, number, number, number];

export type Granularity = 'minute' | 'hour' | 'day' | 'month' | 'year';

export type AggType = 'agg_time' | 'agg_type';

export type RecordType = 'all' | 'income' | 'expense';

export interface UsedTimeRecord {
  timestamp: number;
  seconds: number;
}

export interface FavoriteRecord {
  title: string;
  postLink: string;
  memberLink: string;
  postId: string;
  avatarUrl: string;
  lastUpdated: number;
  replyCount: number;
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