import { LOCALES } from '../../constants';
import { SeriesType } from '../../constants/series';

const seriesTypeOptions = [
  { value: SeriesType.enum.BookSeries, label: 'Book Series' },
  { value: SeriesType.enum.Journal, label: 'Journal' },
];

export const getSeriesTypeOptions = (locale: string) => {
  const options = {
    [LOCALES.enum.en]: seriesTypeOptions,
  };

  const selectedOptions = options[locale as keyof typeof options];

  return selectedOptions ?? options[LOCALES.enum.en];
};
