import { AccessibilityExceptions, LOCALES } from '../../constants';

const accessibilityExceptionOptions = [
  { value: AccessibilityExceptions.enum.DisproportionateBurden, label: 'Disproportionate Burden' },
  { value: AccessibilityExceptions.enum.FundamentalAlteration, label: 'Fundamental Alteration' },
  { value: AccessibilityExceptions.enum.MicroEnterprises, label: 'Micro Enterprises' },
];

export const getAccessibilityExceptionOptions = (locale: string) => {
  const options = {
    [LOCALES.enum.en]: accessibilityExceptionOptions,
  };

  const selectedOptions = options[locale as keyof typeof options];

  return selectedOptions ?? options[LOCALES.enum.en];
};
