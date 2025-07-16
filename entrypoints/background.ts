import { onMessage } from "webext-bridge/background";
import { storage } from "@wxt-dev/storage";
import type { BalanceRecord } from "@/types/types";
import { appendBalanceRecords, getAllBalanceRecords } from "@/service/query";

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

    onMessage('appendBalanceRecords', async ({ data: { records } }) => {
      console.log('appendBalanceRecords', records);
      await appendBalanceRecords(records);
    });

    onMessage('getBalanceRecords', async ({ data: { username } }) => {
      console.log('getBalanceRecords', username);
      const balanceRecords = await getAllBalanceRecords(username);
      console.log('getBalanceRecords', balanceRecords);
      return balanceRecords ?? [];
    });
  }
});
