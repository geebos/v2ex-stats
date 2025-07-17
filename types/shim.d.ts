import { ProtocolWithReturn } from "webext-bridge";
import type { BalanceRecord } from "./types";

export interface BalanceRecordQuery {
  username: string;
  granularity: Granularity;
  start: number;
  end: number;
}

declare module "webext-bridge" {
  export interface ProtocolMap {
    getIsInited: ProtocolWithReturn<void, boolean>;
    setIsInited: ProtocolWithReturn<{ isInited: boolean }, void>;
    appendBalanceRecords: ProtocolWithReturn<{ records: BalanceRecord[] }, void>;
    getBalanceRecords: ProtocolWithReturn<{ username: string }, BalanceRecord[]>;
    getLatestBalanceRecord: ProtocolWithReturn<{ username: string }, BalanceRecord | null>;
    queryBalanceRecords: ProtocolWithReturn<BalanceRecordQuery, BalanceRecord[]>;
  }
}