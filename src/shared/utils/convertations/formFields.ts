import dayjs from 'dayjs';

import { config } from '@/src/shared/config';
import type { FormFieldOption } from '@/src/shared/interfaces';

const {
  dataApi: { textSeparator },
} = config;

export const convertFormFieldsToSelectFieldOptions = (formFields: string[]): FormFieldOption[] => {
  return formFields.map((option) => {
    const words = option.split(textSeparator);
    const preparedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

    return {
      value: option,
      label: preparedWords.join(' '),
    };
  });
};

export const convertEntityToSelectFieldOptions = <T extends { id: string }>(
  data: T[],
  labelKey: keyof T,
): FormFieldOption[] => {
  return data.map((item) => {
    return {
      value: item.id,
      label: `${item[labelKey]}`,
    };
  });
};

export const convertDateToFormattedDate = (date: string) => {
  return dayjs(date).format(config.dateFormat);
};

export const getDateInFuture = (days: number = 1) => {
  const date = dayjs().add(days, 'day');

  return convertDateToFormattedDate(date.toString());
};
