import { describe, expect, it } from 'vitest';

import { AccessibilityStandard, PublicationType } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { ERRORS, FORM_FIELDS } from '@/src/shared/constants';

import { accessibilityValidationSchema, getPublicationFileValidationSchema } from './publication.validation';

const { PUBLICATION_ACCESSIBILITY_STANDARD, PUBLICATION_FILE } = FORM_FIELDS;

const validateStandards = (standards: AccessibilityStandard[]) =>
  accessibilityValidationSchema.safeParse({
    accessibilityStandard: standards,
    accessibilityReportUrl: '',
  });

describe('accessibilityValidationSchema', () => {
  it('accepts a WCAG standard', () => {
    expect(validateStandards([AccessibilityStandard.Wcag21Aa]).success).toBe(true);
  });

  it.each([AccessibilityStandard.PdfUa1, AccessibilityStandard.EpubA11Y11Aa])(
    'accepts a WCAG standard with additional standard %s',
    (additionalStandard) => {
      expect(validateStandards([AccessibilityStandard.Wcag21Aa, additionalStandard]).success).toBe(true);
    },
  );

  it.each([AccessibilityStandard.PdfUa1, AccessibilityStandard.EpubA11Y11Aa])(
    'rejects additional standard %s without a WCAG standard',
    (additionalStandard) => {
      const result = validateStandards([additionalStandard]);

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: ERRORS.ACCESSIBILITY_PRIMARY_STANDARD_REQUIRED,
          path: [PUBLICATION_ACCESSIBILITY_STANDARD.name],
        }),
      );
    },
  );

  it('accepts empty accessibility values', () => {
    expect(validateStandards([]).success).toBe(true);
  });
});

const makeFile = (name: string, type: string, size = 7000) => new File([new Uint8Array(size)], name, { type });

const validateFile = (publicationType: string, file: File) =>
  getPublicationFileValidationSchema(publicationType).safeParse({ [PUBLICATION_FILE.name]: [file] });

const firstMessage = (result: ReturnType<typeof validateFile>) =>
  result.success ? undefined : result.error.issues[0]?.message;

describe('getPublicationFileValidationSchema', () => {
  it.each([
    [PublicationType.Pdf, 'book.pdf'],
    [PublicationType.Mobi, 'book.mobi'],
    [PublicationType.Azw3, 'book.azw3'],
    [PublicationType.FictionBook, 'book.fb2'],
    [PublicationType.FictionBook, 'book.fb2.zip'],
  ])('accepts a supported %s file whose browser MIME type is empty', (publicationType, fileName) => {
    expect(validateFile(publicationType, makeFile(fileName, '')).success).toBe(true);
  });

  it('matches the extension fallback case-insensitively', () => {
    expect(validateFile(PublicationType.Mobi, makeFile('BOOK.MOBI', '')).success).toBe(true);
  });

  it('rejects an unsupported extension when the MIME type is empty', () => {
    const result = validateFile(PublicationType.Mobi, makeFile('malware.exe', ''));

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(ERRORS.FILE_FORMAT_INVALID);
  });

  it('rejects an extension the selected publication type does not support', () => {
    expect(validateFile(PublicationType.Pdf, makeFile('book.mobi', '')).success).toBe(false);
  });

  it('rejects a known unsupported MIME type even when the extension looks supported', () => {
    const result = validateFile(PublicationType.Mobi, makeFile('book.mobi', 'application/x-msdownload'));

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(ERRORS.FILE_FORMAT_INVALID);
  });

  it('accepts a supported MIME type as before', () => {
    expect(validateFile(PublicationType.Pdf, makeFile('book.pdf', 'application/pdf')).success).toBe(true);
  });

  it('still enforces size bounds for empty-MIME files', () => {
    const tiny = validateFile(PublicationType.Mobi, makeFile('book.mobi', '', 10));
    expect(firstMessage(tiny)).toBe(ERRORS.MIN_FILE_SIZE_NOT_MET);

    const oversized = makeFile('book.mobi', '');
    Object.defineProperty(oversized, 'size', { value: appConfig.maxPublicationFileSize + 1 });
    expect(firstMessage(validateFile(PublicationType.Mobi, oversized))).toBe(ERRORS.MAX_FILE_SIZE_EXCEEDED);
  });
});
