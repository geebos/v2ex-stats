export interface AnnualSummaryStats {
  login: LoginStats;
  reply: ReplyStats;
  post: PostStats;
  thank: ThankStats;
  receivedThank: ReceivedThankStats;
  balance: BalanceStats;
  activityHeatmap: ActivityHeatmapStats;
}

export interface LoginStats {
  totalCount: number;
  totalCoins: number;
  avgCoinsPerLogin: number;
  consecutiveDays: number;
  timeDistribution: TimeDistribution;
}

export interface ReplyStats {
  totalCount: number;
  totalCoinsSpent: number;
  avgCoinsPerReply: number;
  timeDistribution: TimeDistribution;
}

export interface PostStats {
  totalCount: number;
  totalCoinsSpent: number;
  avgCoinsPerPost: number;
  timeDistribution: TimeDistribution;
}

export interface ThankStats {
  totalCount: number;
  totalCoinsSpent: number;
  avgCoinsPerThank: number;
  topThankedUsers: Array<{ username: string; count: number }>;
  timeDistribution: TimeDistribution;
}

export interface ReceivedThankStats {
  totalCount: number;
  totalCoinsReceived: number;
  avgCoinsPerThank: number;
  topThankedPosts: Array<{ postId: string; title: string; url: string; count: number }>;
  topThankedComments: Array<{ commentId: string; preview: string; postId: string; postTitle: string; count: number }>;
}

export interface BalanceStats {
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  incomeByType: Record<string, number>;
  expenseByType: Record<string, number>;
}

export interface ActivityHeatmapStats {
  data: number[][];
  maxValue: number;
}

export interface TimeDistribution {
  byMonth: Record<number, number>;
  byWeekday: Record<number, number>;
  byHour: Record<number, number>;
  peakHour: number;
  peakWeekday: number;
}

export interface Title {
  id: string;
  name: string;
  category: 'login' | 'content' | 'interaction' | 'wealth';
  priority: number;
}

export interface AnnualSummaryData {
  username: string;
  year: number;
  startDate: number;
  endDate: number;
  stats: AnnualSummaryStats;
  titles: Title[];
}

