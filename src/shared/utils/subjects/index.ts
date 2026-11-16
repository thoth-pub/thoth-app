import { BIC_CODES } from './bic-codes';
import { BISAC_CODES } from './bisac-codes';
import { THEMA_CODES } from './thema-codes';
import { themaName, type ThemaNames } from './thema-names';

const convertCodeToReadableFormat = (
  describe: (trimmedCode: string) => string | undefined,
  code: string,
  withCode = true,
): string => {
  const trimmedCode = code.trim().toUpperCase();

  if (trimmedCode.length === 0) {
    return trimmedCode;
  }

  const description = describe(trimmedCode);

  if (!description) {
    return trimmedCode;
  }

  return `${withCode ? `${trimmedCode}` : ''} ${description} `;
};

export const convertBisacSubjectCodeToReadableFormat = (code: string, withCode = true): string => {
  return convertCodeToReadableFormat(
    (trimmedCode) => BISAC_CODES[trimmedCode as keyof typeof BISAC_CODES],
    code,
    withCode,
  );
};

export const convertBicSubjectCodeToReadableFormat = (code: string, withCode = true): string => {
  return convertCodeToReadableFormat((trimmedCode) => BIC_CODES[trimmedCode as keyof typeof BIC_CODES], code, withCode);
};

export const convertThemaSubjectCodeToReadableFormat = (
  code: string,
  withCode = true,
  names: ThemaNames = THEMA_CODES,
): string => {
  return convertCodeToReadableFormat((trimmedCode) => themaName(names, trimmedCode), code, withCode);
};
