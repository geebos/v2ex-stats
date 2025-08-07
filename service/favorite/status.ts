import { storage } from "@wxt-dev/storage";

export const setCollapsedStatus = async (username: string, collapsed: boolean) => {
  await storage.setItem(`local:${username}:favoriteCollapsed`, collapsed.toString());
}

export const getCollapsedStatus = async (username: string) => {
  const item = await storage.getItem(`local:${username}:favoriteCollapsed`);
  return item === 'true';
}