import dayjs from 'dayjs';

export const getSameDayAndMonthDateInPast = (years: number) => {
  return dayjs().subtract(years, 'year').toISOString();
};

export const getMonthName = (date: string) => {
  return dayjs(date).format('MMM');
};

export const getStartOfTheCurrentMonthDate = () => {
  return dayjs().startOf('month').add(1, 'day').toISOString();
};

export const substractMonthesFromDate = (date: string, months: number) => {
  return dayjs(date).subtract(months, 'month').toISOString();
};
