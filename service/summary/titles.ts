import type { AnnualSummaryStats, Title } from '@/types/summary';

export function generateTitles(stats: AnnualSummaryStats): Title[] {
  const titles: Title[] = [];

  titles.push(...generateLoginTitles(stats.login));
  titles.push(...generateReplyTitles(stats.reply));
  titles.push(...generatePostTitles(stats.post));
  titles.push(...generateThankTitles(stats.thank));
  titles.push(...generateReceivedThankTitles(stats.receivedThank));
  titles.push(...generateBalanceTitles(stats.balance));

  return titles.sort((a, b) => b.priority - a.priority);
}

function generateLoginTitles(login: AnnualSummaryStats['login']): Title[] {
  const titles: Title[] = [];

  if (login.totalCount < 30) {
    titles.push({ id: 'login-count-1', name: '默默无闻', category: 'login', priority: 1 });
  } else if (login.totalCount < 100) {
    titles.push({ id: 'login-count-2', name: '小有名气', category: 'login', priority: 2 });
  } else if (login.totalCount < 200) {
    titles.push({ id: 'login-count-3', name: '摸鱼专家', category: 'login', priority: 3 });
  } else {
    titles.push({ id: 'login-count-4', name: 'V2EX 铁粉', category: 'login', priority: 4 });
  }

  const peakHour = login.timeDistribution.peakHour;
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'login-time-morning', name: '早起晨读', category: 'login', priority: 2 });
  } else if (peakHour >= 11 && peakHour < 14) {
    titles.push({ id: 'login-time-noon', name: '下饭神器', category: 'login', priority: 2 });
  } else if (peakHour >= 14 && peakHour < 18) {
    titles.push({ id: 'login-time-afternoon', name: '午后时光', category: 'login', priority: 2 });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'login-time-evening', name: '睡前读物', category: 'login', priority: 2 });
  } else {
    titles.push({ id: 'login-time-night', name: '夜猫子', category: 'login', priority: 2 });
  }

  if (login.consecutiveDays < 7) {
    titles.push({ id: 'login-consecutive-1', name: '随性登录', category: 'login', priority: 1 });
  } else if (login.consecutiveDays < 30) {
    titles.push({ id: 'login-consecutive-2', name: '坚持打卡', category: 'login', priority: 2 });
  } else if (login.consecutiveDays < 100) {
    titles.push({ id: 'login-consecutive-3', name: '签到达人', category: 'login', priority: 3 });
  } else {
    titles.push({ id: 'login-consecutive-4', name: '连续登录王', category: 'login', priority: 4 });
  }

  return titles;
}

function generateReplyTitles(reply: AnnualSummaryStats['reply']): Title[] {
  const titles: Title[] = [];

  if (reply.totalCount < 10) {
    titles.push({ id: 'reply-count-1', name: '潜水观察员', category: 'content', priority: 1 });
  } else if (reply.totalCount < 50) {
    titles.push({ id: 'reply-count-2', name: '偶尔冒泡', category: 'content', priority: 2 });
  } else if (reply.totalCount < 200) {
    titles.push({ id: 'reply-count-3', name: '活跃回复者', category: 'content', priority: 3 });
  } else {
    titles.push({ id: 'reply-count-4', name: '话痨本痨', category: 'content', priority: 4 });
  }

  const peakHour = reply.timeDistribution.peakHour;
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'reply-time-morning', name: '晨间思考家', category: 'content', priority: 1 });
  } else if (peakHour >= 11 && peakHour < 14) {
    titles.push({ id: 'reply-time-noon', name: '午休键盘侠', category: 'content', priority: 1 });
  } else if (peakHour >= 14 && peakHour < 18) {
    titles.push({ id: 'reply-time-afternoon', name: '午后评论员', category: 'content', priority: 1 });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'reply-time-evening', name: '夜间评论员', category: 'content', priority: 1 });
  } else {
    titles.push({ id: 'reply-time-night', name: '夜猫子回复家', category: 'content', priority: 1 });
  }

  return titles;
}

function generatePostTitles(post: AnnualSummaryStats['post']): Title[] {
  const titles: Title[] = [];

  if (post.totalCount < 5) {
    titles.push({ id: 'post-count-1', name: '低调发帖人', category: 'content', priority: 1 });
  } else if (post.totalCount < 20) {
    titles.push({ id: 'post-count-2', name: '内容创作者', category: 'content', priority: 2 });
  } else if (post.totalCount < 50) {
    titles.push({ id: 'post-count-3', name: '高产作者', category: 'content', priority: 3 });
  } else {
    titles.push({ id: 'post-count-4', name: '话题制造机', category: 'content', priority: 4 });
  }

  const peakHour = post.timeDistribution.peakHour;
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'post-time-morning', name: '晨间分享家', category: 'content', priority: 1 });
  } else if (peakHour >= 11 && peakHour < 14) {
    titles.push({ id: 'post-time-noon', name: '午间话题王', category: 'content', priority: 1 });
  } else if (peakHour >= 14 && peakHour < 18) {
    titles.push({ id: 'post-time-afternoon', name: '午后发帖人', category: 'content', priority: 1 });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'post-time-evening', name: '夜间发帖人', category: 'content', priority: 1 });
  } else {
    titles.push({ id: 'post-time-night', name: '深夜灵感家', category: 'content', priority: 1 });
  }

  return titles;
}

function generateThankTitles(thank: AnnualSummaryStats['thank']): Title[] {
  const titles: Title[] = [];

  if (thank.totalCount < 5) {
    titles.push({ id: 'thank-count-1', name: '含蓄感谢者', category: 'interaction', priority: 1 });
  } else if (thank.totalCount < 20) {
    titles.push({ id: 'thank-count-2', name: '温暖感谢者', category: 'interaction', priority: 2 });
  } else if (thank.totalCount < 50) {
    titles.push({ id: 'thank-count-3', name: '感谢达人', category: 'interaction', priority: 3 });
  } else {
    titles.push({ id: 'thank-count-4', name: '感谢狂魔', category: 'interaction', priority: 4 });
  }

  if (thank.topThankedUsers.length > 0) {
    const topUserCount = thank.topThankedUsers[0].count;
    const totalCount = thank.totalCount;
    const concentration = topUserCount / totalCount;
    if (concentration > 0.5) {
      titles.push({ id: 'thank-concentration-high', name: '专一感谢者', category: 'interaction', priority: 1 });
    } else {
      titles.push({ id: 'thank-concentration-low', name: '博爱感谢者', category: 'interaction', priority: 1 });
    }
  }

  return titles;
}

function generateReceivedThankTitles(receivedThank: AnnualSummaryStats['receivedThank']): Title[] {
  const titles: Title[] = [];

  if (receivedThank.totalCount < 10) {
    titles.push({ id: 'received-thank-count-1', name: '低调受欢迎', category: 'interaction', priority: 1 });
  } else if (receivedThank.totalCount < 50) {
    titles.push({ id: 'received-thank-count-2', name: '小有名气', category: 'interaction', priority: 2 });
  } else if (receivedThank.totalCount < 100) {
    titles.push({ id: 'received-thank-count-3', name: '社区红人', category: 'interaction', priority: 3 });
  } else {
    titles.push({ id: 'received-thank-count-4', name: '感谢收割机', category: 'interaction', priority: 4 });
  }

  const postCount = receivedThank.topThankedPosts.reduce((sum, p) => sum + p.count, 0);
  const commentCount = receivedThank.topThankedComments.reduce((sum, c) => sum + c.count, 0);
  const total = postCount + commentCount;

  if (total > 0) {
    const postRatio = postCount / total;
    if (postRatio > 0.6) {
      titles.push({ id: 'received-thank-source-post', name: '帖子感谢王', category: 'interaction', priority: 2 });
    } else if (postRatio < 0.4) {
      titles.push({ id: 'received-thank-source-comment', name: '评论感谢王', category: 'interaction', priority: 2 });
    } else {
      titles.push({ id: 'received-thank-source-balanced', name: '全面感谢王', category: 'interaction', priority: 2 });
    }
  }

  return titles;
}

function generateBalanceTitles(balance: AnnualSummaryStats['balance']): Title[] {
  const titles: Title[] = [];

  if (balance.netChange < 100) {
    titles.push({ id: 'balance-net-1', name: '稳健理财', category: 'wealth', priority: 1 });
  } else if (balance.netChange < 500) {
    titles.push({ id: 'balance-net-2', name: '铜币积累者', category: 'wealth', priority: 2 });
  } else if (balance.netChange < 1000) {
    titles.push({ id: 'balance-net-3', name: '铜币大户', category: 'wealth', priority: 3 });
  } else {
    titles.push({ id: 'balance-net-4', name: '铜币富翁', category: 'wealth', priority: 4 });
  }

  if (balance.totalIncome > 0) {
    const expenseRatio = balance.totalExpense / balance.totalIncome;
    if (expenseRatio < 0.3) {
      titles.push({ id: 'balance-expense-1', name: '节俭达人', category: 'wealth', priority: 2 });
    } else if (expenseRatio < 0.7) {
      titles.push({ id: 'balance-expense-2', name: '适度消费', category: 'wealth', priority: 1 });
    } else if (expenseRatio <= 1) {
      titles.push({ id: 'balance-expense-3', name: '挥金如土', category: 'wealth', priority: 2 });
    } else {
      titles.push({ id: 'balance-expense-4', name: '入不敷出', category: 'wealth', priority: 1 });
    }
  }

  return titles;
}

