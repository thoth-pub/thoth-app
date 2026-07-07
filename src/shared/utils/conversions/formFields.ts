import dayjs from 'dayjs';

import { appConfig } from '@/src/shared/config';
import type { FormFieldOption } from '@/src/shared/interfaces';

import { convertDateToFormattedDate } from './date';

const {
  validations: { orcidPrefix, rorPrefix, doiPrefix },
  dataApi: { textSeparator },
} = appConfig;

export const convertOptionToString = (option: string): string => {
  const words = option.split(textSeparator);
  const preparedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return preparedWords.join(' ');
};

export const convertFormFieldsToSelectFieldOptions = (formFields: string[]): FormFieldOption[] => {
  return formFields.map((option) => ({
    value: option,
    label: convertOptionToString(option),
  }));
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

export const getDateInFuture = (days: number = 1) => {
  const date = dayjs().add(days, 'day');

  return convertDateToFormattedDate(date.toString());
};

export const getDateInFutureFromDate = (date: string, days: number = 1) => {
  const dateInFuture = dayjs(date).add(days, 'day');

  return convertDateToFormattedDate(dateInFuture.toString());
};

export const convertLanguageCode = (code: string) => {
  const [start, end] = code.split('_');

  if (!end) return start;

  return `${start}-${end.toUpperCase()}`;
};

export const convertDoiToText = (doi: string) => {
  return doi.replace(doiPrefix, '');
};

export const convertOrchidIdToText = (orcidId: string) => {
  return orcidId.replace(orcidPrefix, '');
};

export const convertRorIdToText = (rorId: string) => {
  return rorId.replace(rorPrefix, '');
};

export const mapOptionsToLabels = (values: string[], options: FormFieldOption[]): string => {
  return values
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .join(', ');
};

export const mapOptionToLabel = (value: string, options: FormFieldOption[]): string => {
  return options.find((option) => option.value === value)?.label ?? value;
};
