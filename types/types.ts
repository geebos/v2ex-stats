export interface BalanceRecord {
  timestamp: number;
  type: string;
  delta: number;
  balance: number;
  username: string;
}

export interface PageInfo {
  username: string;
  isLoggedIn: boolean;
  isBalancePage: boolean;
  isV2ex: boolean;
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