import { BISAC_CODES } from './bisac-codes';
import { BIC_CODES } from './bic-codes';
import { THEMA_CODES } from './thema-codes';

export const convertBisacSubjectCodeToReadableFormat = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const trimmedCode = code.trim().toUpperCase();

  const description = BISAC_CODES[trimmedCode as keyof typeof BISAC_CODES];

  return `${description} (${trimmedCode})` || trimmedCode;
};

export const convertBicSubjectCodeToReadableFormat = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const trimmedCode = code.trim().toUpperCase();

  const description = BIC_CODES[trimmedCode as keyof typeof BIC_CODES];

  return `${description} (${trimmedCode})` || trimmedCode;
};

export const convertThemaSubjectCodeToReadableFormat = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const trimmedCode = code.trim().toUpperCase();

  const description = THEMA_CODES[trimmedCode as keyof typeof THEMA_CODES];

  return `${description} (${trimmedCode})` || trimmedCode;
};
