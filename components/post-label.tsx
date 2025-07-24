import { getPostStatus } from "@/service/history/post";
import { getPostInfo } from "@/service/history/collect";
import { xpath } from "@/service/utils";
import { getIsDarkMode } from "@/service/utils";

// 初始化帖子标签功能，监听页面显示事件
export const tryInitPostsLabel = async (username: string): Promise<void> => {
  injectStyle();
  updatePostsLable(username);
  // 页面恢复时重新更新标签
  window.addEventListener('pageshow', () => {
    updatePostsLable(username);
  });
}

// 更新帖子列表中的新回复数标签
const updatePostsLable = (username: string) =>{
  // 获取主页帖子列表中的回复数链接
  const aList = xpath('(//div[@id="Main"]//div[@class="box"])[1]//div[@class="cell item"]//td[4]/a', document.body) as Node[];
  console.log('帖子评论数标签', aList);
  if (aList.length === 0) {
    return;
  }

  aList.forEach(async (a) => {
    const anchor = a as HTMLAnchorElement;
    // 从链接URL中解析帖子ID和当前回复数
    const { postId, replyCount } = getPostInfo(anchor.href);
    if (!postId) {
      return;
    }
    // 获取用户历史访问时的回复数
    const postStatus = await getPostStatus(username, postId);
    // 如果有新回复则显示增量标签
    if (postStatus && replyCount > postStatus.replyCount) {
      anchor.style.position = 'relative';
      anchor.classList.add('v-stats-count-label');
      const newCount = replyCount - postStatus.replyCount;
      anchor.setAttribute('data-new', newCount > 0 ? `+${newCount}` : newCount.toString());
    } else {
      // 清除标签样式
      anchor.classList.remove('v-stats-count-label');
      anchor.removeAttribute('data-new');
    }
  });

}

// 注入新回复数标签的CSS样式
const injectStyle = () => {
  const isDarkMode = getIsDarkMode();
  // 根据主题模式设置标签颜色
  const color = isDarkMode ? '#2E7D32' : '#4CAF50';
  const style = document.createElement('style');
  style.textContent = `
    .v-stats-count-label::after {
      content: attr(data-new); /* 从属性读取新增数量 */
      position: absolute;
      top: -8px;
      right: -15px;
      background-color: ${color}; /* 绿色表示新增 */
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 999px;
    }`;
  document.head.appendChild(style);
}