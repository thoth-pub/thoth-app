import { config } from '@/config';
import type { FormFieldOption } from '@/interfaces';

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
