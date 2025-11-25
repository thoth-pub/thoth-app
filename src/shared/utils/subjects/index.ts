import { BISAC_CODES } from './bisac-codes';
import { BIC_CODES } from './bic-codes';
import { THEMA_CODES } from './thema-codes';

export const convertBisacSubjectCodeToReadableFormat = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const trimmedCode = code.trim().toUpperCase();

  const description = BISAC_CODES[trimmedCode];

  return description || trimmedCode;
};

export const convertBicSubjectCodeToReadableFormat = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const trimmedCode = code.trim().toUpperCase();

  const description = BIC_CODES[trimmedCode];

  return description || trimmedCode;
};

export const convertThemaSubjectCodeToReadableFormat = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  const trimmedCode = code.trim().toUpperCase();

  const description = THEMA_CODES[trimmedCode];

  return description || trimmedCode;
};
