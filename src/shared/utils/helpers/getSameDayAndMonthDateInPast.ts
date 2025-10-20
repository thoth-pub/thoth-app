import dayjs from 'dayjs';

export const getSameDayAndMonthDateInPast = (years: number) => {
  return dayjs().subtract(years, 'year').toISOString();
};
