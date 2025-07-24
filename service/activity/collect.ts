import { minimunTimeSpan, throttleSeconds, updateMonthTimeRecord } from "./query";
import throttle from "lodash.throttle";

let isListenerBound = false; // 防重复初始化标志

// 初始化用户活动时间收集，监听交互事件记录在线时间
const initCollect = (username: string) => {
  if (isListenerBound) {
    console.log('统计已初始化，跳过');
    return;
  }
  
  console.log('初始化统计', username);
  isListenerBound = true;

  // 节流处理的事件处理器，避免频繁触发并记录时间
  const eventHandler = throttle(() => {
    const record = { timestamp: Date.now(), seconds: minimunTimeSpan };
    updateMonthTimeRecord(username, record);
    console.log('触发统计事件', username, record);
  }, throttleSeconds * 1000);

  // 注册所有用户活动事件监听器
  const registerAllEvents = () => {
    window.addEventListener('mousemove', eventHandler);
    window.addEventListener('keydown', eventHandler);
    window.addEventListener('keyup', eventHandler);
    window.addEventListener('keypress', eventHandler);
    window.addEventListener('scroll', eventHandler);
    window.addEventListener('resize', eventHandler);
    window.addEventListener('focus', eventHandler);
  };

  // 确保在 DOM 加载完成后注册事件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerAllEvents();
    });
  } else {
    registerAllEvents();
  }
  
  console.log('初始化统计完成', username);
};

export { initCollect };