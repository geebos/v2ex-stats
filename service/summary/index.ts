import { calculateAnnualSummaryStats, getDefaultDateRange, getNearestYear } from './stats';
import { generateTitles } from './titles';
import type { AnnualSummaryData } from '@/types/summary';

export async function generateAnnualSummary(username: string, year?: number): Promise<AnnualSummaryData> {
  const { startDate, endDate } = getDefaultDateRange();
  const stats = await calculateAnnualSummaryStats(username, startDate, endDate);
  const titles = generateTitles(stats);
  const finalYear = year ?? getNearestYear();

  return {
    username,
    year: finalYear,
    startDate,
    endDate,
    stats,
    titles,
  };
}

export { calculateAnnualSummaryStats, getDefaultDateRange, getNearestYear } from './stats';
export { generateTitles } from './titles';

