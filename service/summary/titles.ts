import type { AnnualSummaryStats, Title } from '@/types/summary';

export function generateTitles(stats: AnnualSummaryStats): Title[] {
  const titles: Title[] = [];

  titles.push(...generateLoginTitles(stats.login));
  titles.push(...generateReplyTitles(stats.reply));
  titles.push(...generatePostTitles(stats.post));
  titles.push(...generateThankTitles(stats.thank));
  titles.push(...generateReceivedThankTitles(stats.receivedThank));
  titles.push(...generateBalanceTitles(stats.balance));
  titles.push(...generateActivityHeatmapTitles(stats.activityHeatmap));

  return titles.sort((a, b) => b.priority - a.priority);
}

function generateLoginTitles(login: AnnualSummaryStats['login']): Title[] {
  const titles: Title[] = [];

  if (login.totalCount < 30) {
    titles.push({ id: 'login-count-1', name: '默默无闻', category: 'login', priority: 1, description: `登录 ${login.totalCount} 次`, thresholdDescription: '登录少于 30 次' });
  } else if (login.totalCount < 100) {
    titles.push({ id: 'login-count-2', name: '小有名气', category: 'login', priority: 2, description: `登录 ${login.totalCount} 次`, thresholdDescription: '登录大于 30 次' });
  } else if (login.totalCount < 200) {
    titles.push({ id: 'login-count-3', name: '摸鱼专家', category: 'login', priority: 3, description: `登录 ${login.totalCount} 次`, thresholdDescription: '登录大于 100 次' });
  } else {
    titles.push({ id: 'login-count-4', name: 'V2EX 铁粉', category: 'login', priority: 4, description: `登录 ${login.totalCount} 次`, thresholdDescription: '登录大于 200 次' });
  }

  const peakHour = login.timeDistribution.peakHour;
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'login-time-morning', name: '早起晨读', category: 'login', priority: 2, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 6-9 点' });
  } else if (peakHour >= 9 && peakHour < 14) {
    titles.push({ id: 'login-time-noon', name: '下饭神器', category: 'login', priority: 2, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 9-14 点' });
  } else if (peakHour >= 14 && peakHour < 19) {
    titles.push({ id: 'login-time-afternoon', name: '午后时光', category: 'login', priority: 2, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 14-19 点' });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'login-time-evening', name: '睡前读物', category: 'login', priority: 2, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 19-23 点' });
  } else {
    titles.push({ id: 'login-time-night', name: '夜猫子', category: 'login', priority: 2, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 23-6 点' });
  }

  if (login.consecutiveDays < 7) {
    titles.push({ id: 'login-consecutive-1', name: '随性登录', category: 'login', priority: 1, description: `连续登录 ${login.consecutiveDays} 天`, thresholdDescription: '连续登录少于 7 天' });
  } else if (login.consecutiveDays < 30) {
    titles.push({ id: 'login-consecutive-2', name: '坚持打卡', category: 'login', priority: 2, description: `连续登录 ${login.consecutiveDays} 天`, thresholdDescription: '连续登录大于 7 天' });
  } else if (login.consecutiveDays < 100) {
    titles.push({ id: 'login-consecutive-3', name: '签到达人', category: 'login', priority: 3, description: `连续登录 ${login.consecutiveDays} 天`, thresholdDescription: '连续登录大于 30 天' });
  } else {
    titles.push({ id: 'login-consecutive-4', name: '连续登录王', category: 'login', priority: 4, description: `连续登录 ${login.consecutiveDays} 天`, thresholdDescription: '连续登录大于 100 天' });
  }

  return titles;
}

function generateReplyTitles(reply: AnnualSummaryStats['reply']): Title[] {
  const titles: Title[] = [];

  if (reply.totalCount < 10) {
    titles.push({ id: 'reply-count-1', name: '潜水观察员', category: 'content', priority: 1, description: `回复 ${reply.totalCount} 次`, thresholdDescription: '回复少于 10 次' });
  } else if (reply.totalCount < 50) {
    titles.push({ id: 'reply-count-2', name: '偶尔冒泡', category: 'content', priority: 2, description: `回复 ${reply.totalCount} 次`, thresholdDescription: '回复大于 10 次' });
  } else if (reply.totalCount < 200) {
    titles.push({ id: 'reply-count-3', name: '活跃回复者', category: 'content', priority: 3, description: `回复 ${reply.totalCount} 次`, thresholdDescription: '回复大于 50 次' });
  } else {
    titles.push({ id: 'reply-count-4', name: '话痨本痨', category: 'content', priority: 4, description: `回复 ${reply.totalCount} 次`, thresholdDescription: '回复大于 200 次' });
  }

  const peakHour = reply.timeDistribution.peakHour;
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'reply-time-morning', name: '晨间思考家', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 6-9 点' });
  } else if (peakHour >= 9 && peakHour < 14) {
    titles.push({ id: 'reply-time-noon', name: '午休键盘侠', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 9-14 点' });
  } else if (peakHour >= 14 && peakHour < 19) {
    titles.push({ id: 'reply-time-afternoon', name: '午后评论员', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 14-19 点' });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'reply-time-evening', name: '夜间评论员', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 19-23 点' });
  } else {
    titles.push({ id: 'reply-time-night', name: '夜猫子回复家', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 23-6 点' });
  }

  return titles;
}

function generatePostTitles(post: AnnualSummaryStats['post']): Title[] {
  const titles: Title[] = [];

  if (post.totalCount < 5) {
    titles.push({ id: 'post-count-1', name: '低调发帖人', category: 'content', priority: 1, description: `发帖 ${post.totalCount} 次`, thresholdDescription: '发帖少于 5 次' });
  } else if (post.totalCount < 20) {
    titles.push({ id: 'post-count-2', name: '内容创作者', category: 'content', priority: 2, description: `发帖 ${post.totalCount} 次`, thresholdDescription: '发帖大于 5 次' });
  } else if (post.totalCount < 50) {
    titles.push({ id: 'post-count-3', name: '高产作者', category: 'content', priority: 3, description: `发帖 ${post.totalCount} 次`, thresholdDescription: '发帖大于 20 次' });
  } else {
    titles.push({ id: 'post-count-4', name: '话题制造机', category: 'content', priority: 4, description: `发帖 ${post.totalCount} 次`, thresholdDescription: '发帖大于 50 次' });
  }

  const peakHour = post.timeDistribution.peakHour;
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'post-time-morning', name: '晨间分享家', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 6-9 点' });
  } else if (peakHour >= 9 && peakHour < 14) {
    titles.push({ id: 'post-time-noon', name: '午间话题王', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 9-14 点' });
  } else if (peakHour >= 14 && peakHour < 19) {
    titles.push({ id: 'post-time-afternoon', name: '午后发帖人', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 14-19 点' });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'post-time-evening', name: '夜间发帖人', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 19-23 点' });
  } else {
    titles.push({ id: 'post-time-night', name: '深夜灵感家', category: 'content', priority: 1, description: `高峰时段 ${peakHour}:00`, thresholdDescription: '高峰时段在 23-6 点' });
  }

  return titles;
}

function generateThankTitles(thank: AnnualSummaryStats['thank']): Title[] {
  const titles: Title[] = [];

  if (thank.totalCount < 5) {
    titles.push({ id: 'thank-count-1', name: '含蓄感谢者', category: 'interaction', priority: 1, description: `感谢他人 ${thank.totalCount} 次`, thresholdDescription: '感谢他人少于 5 次' });
  } else if (thank.totalCount < 20) {
    titles.push({ id: 'thank-count-2', name: '温暖感谢者', category: 'interaction', priority: 2, description: `感谢他人 ${thank.totalCount} 次`, thresholdDescription: '感谢他人大于 5 次' });
  } else if (thank.totalCount < 50) {
    titles.push({ id: 'thank-count-3', name: '感谢达人', category: 'interaction', priority: 3, description: `感谢他人 ${thank.totalCount} 次`, thresholdDescription: '感谢他人大于 20 次' });
  } else {
    titles.push({ id: 'thank-count-4', name: '感谢狂魔', category: 'interaction', priority: 4, description: `感谢他人 ${thank.totalCount} 次`, thresholdDescription: '感谢他人大于 50 次' });
  }

  if (thank.topThankedUsers.length > 0) {
    const topUserCount = thank.topThankedUsers[0].count;
    const totalCount = thank.totalCount;
    const concentration = topUserCount / totalCount;
    const concentrationPercent = Math.round(concentration * 100);
    if (concentration > 0.5) {
      titles.push({ id: 'thank-concentration-high', name: '专一感谢者', category: 'interaction', priority: 1, description: `最常感谢的用户占比 ${concentrationPercent}%`, thresholdDescription: '最常感谢的用户占比大于 50%' });
    } else {
      titles.push({ id: 'thank-concentration-low', name: '博爱感谢者', category: 'interaction', priority: 1, description: `最常感谢的用户占比 ${concentrationPercent}%`, thresholdDescription: '最常感谢的用户占比小于 50%' });
    }
  }

  return titles;
}

function generateReceivedThankTitles(receivedThank: AnnualSummaryStats['receivedThank']): Title[] {
  const titles: Title[] = [];

  if (receivedThank.totalCount < 10) {
    titles.push({ id: 'received-thank-count-1', name: '低调受欢迎', category: 'interaction', priority: 1, description: `收到感谢 ${receivedThank.totalCount} 次`, thresholdDescription: '收到感谢少于 10 次' });
  } else if (receivedThank.totalCount < 50) {
    titles.push({ id: 'received-thank-count-2', name: '小有名气', category: 'interaction', priority: 2, description: `收到感谢 ${receivedThank.totalCount} 次`, thresholdDescription: '收到感谢大于 10 次' });
  } else if (receivedThank.totalCount < 100) {
    titles.push({ id: 'received-thank-count-3', name: '社区红人', category: 'interaction', priority: 3, description: `收到感谢 ${receivedThank.totalCount} 次`, thresholdDescription: '收到感谢大于 50 次' });
  } else {
    titles.push({ id: 'received-thank-count-4', name: '感谢收割机', category: 'interaction', priority: 4, description: `收到感谢 ${receivedThank.totalCount} 次`, thresholdDescription: '收到感谢大于 100 次' });
  }

  const postCount = receivedThank.topThankedPosts.reduce((sum, p) => sum + p.count, 0);
  const commentCount = receivedThank.topThankedComments.reduce((sum, c) => sum + c.count, 0);
  const total = postCount + commentCount;

  if (total > 0) {
    const postRatio = postCount / total;
    const postRatioPercent = Math.round(postRatio * 100);
    if (postRatio > 0.6) {
      titles.push({ id: 'received-thank-source-post', name: '帖子感谢王', category: 'interaction', priority: 2, description: `帖子感谢占比 ${postRatioPercent}%`, thresholdDescription: '帖子感谢占比大于 60%' });
    } else if (postRatio < 0.4) {
      titles.push({ id: 'received-thank-source-comment', name: '评论感谢王', category: 'interaction', priority: 2, description: `评论感谢占比 ${100 - postRatioPercent}%`, thresholdDescription: '评论感谢占比大于 60%' });
    } else {
      titles.push({ id: 'received-thank-source-balanced', name: '全面感谢王', category: 'interaction', priority: 2, description: `帖子/评论感谢比 ${postRatioPercent}%/${100 - postRatioPercent}%`, thresholdDescription: '帖子与评论感谢比例均衡' });
    }
  }

  return titles;
}

function generateBalanceTitles(balance: AnnualSummaryStats['balance']): Title[] {
  const titles: Title[] = [];
  const netChange = Math.round(balance.netChange);

  if (balance.netChange < 100) {
    titles.push({ id: 'balance-net-1', name: '稳健理财', category: 'wealth', priority: 1, description: `净收入 ${netChange} 铜币`, thresholdDescription: '净收入少于 100 铜币' });
  } else if (balance.netChange < 500) {
    titles.push({ id: 'balance-net-2', name: '铜币积累者', category: 'wealth', priority: 2, description: `净收入 ${netChange} 铜币`, thresholdDescription: '净收入大于 100 铜币' });
  } else if (balance.netChange < 1000) {
    titles.push({ id: 'balance-net-3', name: '铜币大户', category: 'wealth', priority: 3, description: `净收入 ${netChange} 铜币`, thresholdDescription: '净收入大于 500 铜币' });
  } else {
    titles.push({ id: 'balance-net-4', name: '铜币富翁', category: 'wealth', priority: 4, description: `净收入 ${netChange} 铜币`, thresholdDescription: '净收入大于 1000 铜币' });
  }

  if (balance.totalIncome > 0) {
    const expenseRatio = balance.totalExpense / balance.totalIncome;
    const expenseRatioPercent = Math.round(expenseRatio * 100);
    if (expenseRatio < 0.3) {
      titles.push({ id: 'balance-expense-1', name: '节俭达人', category: 'wealth', priority: 2, description: `支出/收入比 ${expenseRatioPercent}%`, thresholdDescription: '支出/收入比少于 30%' });
    } else if (expenseRatio < 0.7) {
      titles.push({ id: 'balance-expense-2', name: '适度消费', category: 'wealth', priority: 1, description: `支出/收入比 ${expenseRatioPercent}%`, thresholdDescription: '支出/收入比在 30%-70%' });
    } else if (expenseRatio <= 1) {
      titles.push({ id: 'balance-expense-3', name: '挥金如土', category: 'wealth', priority: 2, description: `支出/收入比 ${expenseRatioPercent}%`, thresholdDescription: '支出/收入比大于 70%' });
    } else {
      titles.push({ id: 'balance-expense-4', name: '入不敷出', category: 'wealth', priority: 1, description: `支出/收入比 ${expenseRatioPercent}%`, thresholdDescription: '支出/收入比大于 100%' });
    }
  }

  return titles;
}

function generateActivityHeatmapTitles(activityHeatmap: AnnualSummaryStats['activityHeatmap']): Title[] {
  const titles: Title[] = [];
  const { data, maxValue } = activityHeatmap;

  if (!data || data.length === 0 || maxValue === 0) {
    return titles;
  }

  // 计算每个小时的总活动量
  const hourlyActivity = new Array(24).fill(0);
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      hourlyActivity[hour] += data[weekday]?.[hour] ?? 0;
    }
  }

  // 找出最活跃的时段
  let peakHour = 0;
  let peakValue = 0;
  for (let hour = 0; hour < 24; hour++) {
    if (hourlyActivity[hour] > peakValue) {
      peakValue = hourlyActivity[hour];
      peakHour = hour;
    }
  }

  // 根据最活跃时段生成称号
  if (peakHour >= 6 && peakHour < 9) {
    titles.push({ id: 'activity-time-morning', name: '早起鸟', category: 'activity', priority: 2, description: `最活跃时段 ${peakHour}:00`, thresholdDescription: '最活跃时段在 6-9 点' });
  } else if (peakHour >= 9 && peakHour < 14) {
    titles.push({ id: 'activity-time-noon', name: '午间战士', category: 'activity', priority: 2, description: `最活跃时段 ${peakHour}:00`, thresholdDescription: '最活跃时段在 9-14 点' });
  } else if (peakHour >= 14 && peakHour < 19) {
    titles.push({ id: 'activity-time-afternoon', name: '午后思考者', category: 'activity', priority: 2, description: `最活跃时段 ${peakHour}:00`, thresholdDescription: '最活跃时段在 14-19 点' });
  } else if (peakHour >= 19 && peakHour < 23) {
    titles.push({ id: 'activity-time-evening', name: '夜间精灵', category: 'activity', priority: 2, description: `最活跃时段 ${peakHour}:00`, thresholdDescription: '最活跃时段在 19-23 点' });
  } else {
    titles.push({ id: 'activity-time-night', name: '深夜猫头鹰', category: 'activity', priority: 2, description: `最活跃时段 ${peakHour}:00`, thresholdDescription: '最活跃时段在 23-6 点' });
  }

  // 计算工作日和周末的活动量
  let weekdayActivity = 0;
  let weekendActivity = 0;
  for (let weekday = 0; weekday < 7; weekday++) {
    const dailySum = data[weekday]?.reduce((sum, val) => sum + val, 0) ?? 0;
    if (weekday >= 1 && weekday <= 5) {
      weekdayActivity += dailySum;
    } else {
      weekendActivity += dailySum;
    }
  }

  // 根据工作日/周末活跃度生成称号
  const totalActivity = weekdayActivity + weekendActivity;
  if (totalActivity > 0) {
    const weekdayRatio = weekdayActivity / totalActivity;
    const weekdayRatioPercent = Math.round(weekdayRatio * 100);
    if (weekdayRatio > 0.75) {
      titles.push({ id: 'activity-weekday', name: '工作日战士', category: 'activity', priority: 2, description: `工作日活跃占比 ${weekdayRatioPercent}%`, thresholdDescription: '工作日活跃占比大于 75%' });
    } else if (weekdayRatio < 0.5) {
      titles.push({ id: 'activity-weekend', name: '周末达人', category: 'activity', priority: 2, description: `周末活跃占比 ${100 - weekdayRatioPercent}%`, thresholdDescription: '周末活跃占比大于 50%' });
    } else {
      titles.push({ id: 'activity-balanced', name: '全天候在线', category: 'activity', priority: 1, description: `工作日/周末活跃比 ${weekdayRatioPercent}%/${100 - weekdayRatioPercent}%`, thresholdDescription: '工作日与周末活跃比例均衡' });
    }
  }

  return titles;
}

