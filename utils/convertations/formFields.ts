import { config } from '@/config';
import type { FormFieldOption } from '@/interfaces';

const {
  dataApi: { textSeparator },
} = config;

export const convertFormFieldsToOptions = (formFields: string[]): FormFieldOption[] => {
  return formFields.map((option) => {
    const words = option.split(textSeparator);
    const preparedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

    return {
      value: option,
      label: preparedWords.join(' '),
    };
  });
};
