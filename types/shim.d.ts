import { ProtocolWithReturn } from "webext-bridge";
import type { BalanceRecord, BalanceRecordQuery } from "./types";

declare module "webext-bridge" {
  export interface ProtocolMap {
    getIsInited: ProtocolWithReturn<{ username: string }, boolean>;
    setIsInited: ProtocolWithReturn<{ username: string; isInited: boolean }, void>;
    getLatestCrawlerPage: ProtocolWithReturn<{ username: string }, number>;
    setLatestCrawlerPage: ProtocolWithReturn<{ username: string; page: number }, void>;
    appendBalanceRecords: ProtocolWithReturn<{ records: BalanceRecord[] }, void>;
    getBalanceRecords: ProtocolWithReturn<{ username: string }, BalanceRecord[]>;
    getLatestBalanceRecord: ProtocolWithReturn<{ username: string }, BalanceRecord | null>;
    queryBalanceRecords: ProtocolWithReturn<BalanceRecordQuery, BalanceRecord[]>;
    getStorageSize: ProtocolWithReturn<void, number>;
  }
}