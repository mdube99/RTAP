import { useMemo } from 'react';
import type { TimeRange } from './time-range-filter';

export function useDateRange(range: TimeRange, customStartDate: string, customEndDate: string) {
  return useMemo(() => {
    const end = new Date();
    if (range === 'custom' && customStartDate && customEndDate) {
      return { start: new Date(customStartDate), end: new Date(customEndDate) };
    }
    const start = new Date(end);
    if (range === 'month') start.setMonth(end.getMonth() - 1);
    else if (range === 'quarter') start.setMonth(end.getMonth() - 3);
    else if (range === 'year') start.setFullYear(end.getFullYear() - 1);
    else if (range === 'all') start.setTime(0);
    return { start, end };
  }, [range, customStartDate, customEndDate]);
}
