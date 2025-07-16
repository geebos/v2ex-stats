export interface BalanceRecord {
  timestamp: number;
  type: string;
  delta: number;
  balance: number;
}