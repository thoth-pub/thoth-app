import type { FormFieldOption } from '../interfaces';
import { THEMA_CODES } from '../utils/subjects/thema-codes';
import { themaName, type ThemaNames } from '../utils/subjects/thema-names';

const optionsByNames = new WeakMap<ThemaNames, FormFieldOption[]>();

/** One option per Thema code, in `THEMA_CODES` order, labelled with the name from `names` (English fallback). */
export const themaFormFieldsFor = (names: ThemaNames): FormFieldOption[] => {
  const cached = optionsByNames.get(names);
  if (cached) {
    return cached;
  }

  const options = Object.keys(THEMA_CODES).map((value) => ({
    value,
    label: `${value} (${themaName(names, value)}) `,
  }));
  optionsByNames.set(names, options);

  return options;
};

export const themaFormFields = themaFormFieldsFor(THEMA_CODES);
