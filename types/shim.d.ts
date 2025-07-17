import { ProtocolWithReturn } from "webext-bridge";
import type { BalanceRecord } from "./types";

declare module "webext-bridge" {
  export interface ProtocolMap {
    getIsInited: ProtocolWithReturn<void, boolean>;
    setIsInited: ProtocolWithReturn<{ isInited: boolean }, void>;
    appendBalanceRecords: ProtocolWithReturn<{ records: BalanceRecord[] }, void>;
    getBalanceRecords: ProtocolWithReturn<{ username: string }, BalanceRecord[]>;
    getLatestBalanceRecord: ProtocolWithReturn<{ username: string }, BalanceRecord | null>;
    queryBalanceRecords: ProtocolWithReturn<{ username: string, granularity: 'minute' | 'hour' | 'day' | 'month' | 'year', start: number, end: number }, BalanceRecord[]>;
  }
}