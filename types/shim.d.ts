import { ProtocolWithReturn } from "webext-bridge";
import type { BalanceRecord } from "./types";

declare module "webext-bridge" {
  export interface ProtocolMap {
    getIsInited: ProtocolWithReturn<void, boolean>;
    setIsInited: ProtocolWithReturn<{ isInited: boolean }, void>;
    appendBalanceRecords: ProtocolWithReturn<{ records: BalanceRecord[] }, void>;
    getBalanceRecords: ProtocolWithReturn<{ username: string }, BalanceRecord[]>;
  }
}