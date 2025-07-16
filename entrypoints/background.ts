import { onMessage } from "webext-bridge/background";
import { storage } from "@wxt-dev/storage";
import type { BalanceRecord } from "@/types/types";

export default defineBackground({
  main: async () => {
    console.log('Hello background!', { id: browser.runtime.id });

    onMessage('getIsInited', async () => {
      const isInited = await storage.getItem<boolean>('local:isInited');
      console.log('getIsInited', isInited);
      return isInited ?? false;
    });

    onMessage('setIsInited', async ({ data: { isInited } }) => {
      console.log('setIsInited', isInited);
      await storage.setItem('local:isInited', isInited);
    });

    onMessage('appendBalanceRecords', async ({ data: { username, records } }) => {
      console.log('appendBalanceRecords', username, records);
      const balanceRecords = await storage.getItem<BalanceRecord[]>(`local:balanceRecords:${username}`);
      const concatRecords = [...(balanceRecords ?? []), ...records];
      const uniqueRecords = uniqueBalanceRecords(concatRecords);
      await storage.setItem(`local:balanceRecords:${username}`, uniqueRecords);
    });

    onMessage('getBalanceRecords', async ({ data: { username } }) => {
      console.log('getBalanceRecords', username);
      const balanceRecords = await storage.getItem<BalanceRecord[]>(`local:balanceRecords:${username}`);
      console.log('getBalanceRecords', balanceRecords);
      return balanceRecords ?? [];
    });
  }
});

function uniqueBalanceRecords(records: BalanceRecord[]) {
  const uniqueMap = new Map<string, BalanceRecord>();

  for (const record of records) {
    const key = `${record.timestamp}${record.balance}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, record);
    }
  }

  return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}
