import { browser } from 'wxt/browser';

const setupBalanceQueryHandler = () => {
  if (browser.action) {
    // TODO：兼容 Firefox 的 action 事件，wxt 编译的 v3 firefox 加载报错，先不处理
    browser.action.onClicked.addListener(async () => {
      browser.tabs.create({ url: 'https://v2ex.com/balance' });
    });
  }
};

export default defineBackground({
  main: async () => {
    console.log('Hello background!', { id: browser.runtime.id });

    setupBalanceQueryHandler();
  }
});
