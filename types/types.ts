export interface BalanceRecord {
  timestamp: number;
  type: string;
  delta: number;
  balance: number;
  username?: string;
}

export interface PageInfo {
  username: string;
  isLoggedIn: boolean;
  isBalancePage: boolean;
  isV2ex: boolean;
}

export type Granularity = 'minute' | 'hour' | 'day' | 'month' | 'year';

export type AggType = 'agg_time' | 'agg_type';