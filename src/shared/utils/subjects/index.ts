import { BISAC_CODES } from './bisac-codes';
import { BIC_CODES } from './bic-codes';
import { THEMA_CODES } from './thema-codes';

const convertCodeToReadableFormat = (codes: Record<string, string>, code: string, withCode = true): string => {
  const trimmedCode = code.trim().toUpperCase();

  const description = codes[trimmedCode as keyof typeof codes];

  return `${withCode ? `${trimmedCode}` : ''} ${description} ` || trimmedCode;
};

export const convertBisacSubjectCodeToReadableFormat = (code: string, withCode = true): string => {
  return convertCodeToReadableFormat(BISAC_CODES, code, withCode);
};

export const convertBicSubjectCodeToReadableFormat = (code: string, withCode = true): string => {
  return convertCodeToReadableFormat(BIC_CODES, code, withCode);
};

export const convertThemaSubjectCodeToReadableFormat = (code: string, withCode = true): string => {
  return convertCodeToReadableFormat(THEMA_CODES, code, withCode);
};
