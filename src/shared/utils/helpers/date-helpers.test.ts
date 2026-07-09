import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import {
  getMonthName,
  getSameDayAndMonthDateInPast,
  getStartOfTheCurrentMonthDate,
  getYear,
  substractMonthesFromDate,
} from './getSameDayAndMonthDateInPast';

describe('getSameDayAndMonthDateInPast', () => {
  it('returns an ISO date string from the past', () => {
    vi.useFakeTimers().setSystemTime(new Date('2024-06-15'));
    const result = getSameDayAndMonthDateInPast(1);
    expect(dayjs(result).format('YYYY-MM-DD')).toBe('2023-06-15');
    vi.useRealTimers();
  });

  it('subtracts multiple years', () => {
    vi.useFakeTimers().setSystemTime(new Date('2024-06-15'));
    const result = getSameDayAndMonthDateInPast(5);
    expect(dayjs(result).format('YYYY-MM-DD')).toBe('2019-06-15');
    vi.useRealTimers();
  });
});

describe('getMonthName', () => {
  it('returns abbreviated month name', () => {
    expect(getMonthName('2024-01-15')).toBe('Jan');
  });

  it('handles different months', () => {
    expect(getMonthName('2024-12-01')).toBe('Dec');
  });
});

describe('getStartOfTheCurrentMonthDate', () => {
  it('returns the second day of the current month', () => {
    vi.useFakeTimers().setSystemTime(new Date('2024-06-15'));
    const result = getStartOfTheCurrentMonthDate();
    expect(dayjs(result).format('YYYY-MM-DD')).toBe('2024-06-02');
    vi.useRealTimers();
  });
});

describe('substractMonthesFromDate', () => {
  it('subtracts months from a given date', () => {
    const result = substractMonthesFromDate('2024-06-15', 2);
    expect(dayjs(result).format('YYYY-MM-DD')).toBe('2024-04-15');
  });

  it('handles year boundary', () => {
    const result = substractMonthesFromDate('2024-02-15', 3);
    expect(dayjs(result).format('YYYY-MM-DD')).toBe('2023-11-15');
  });
});

describe('getYear', () => {
  it('extracts the 4-digit year', () => {
    expect(getYear('2024-06-15')).toBe('2024');
  });
});
