import { describe, expect, it } from 'vitest';

import { AccessibilityException, AccessibilityStandard, PublicationType } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import {
  accessibilityAdditionalStandards,
  accessibilityStandards,
  ERRORS,
  FORM_FIELDS,
  getAccessibilityStandardOptions,
} from '@/src/shared/constants';

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

  /*
   * The ordinary form already holds the database contract the ONIX importer is reconciled with (thoth-app#221;
   * thoth#893 Architecture Amendment 3): WCAG alone in the primary slot, an additional standard only beside one, and
   * standards and an EAA exception never together. These regressions keep it from being relaxed to the superseded,
   * broader state space.
   */
  it.each(accessibilityAdditionalStandards)('rejects additional standard %s without a WCAG standard', (additional) => {
    expect(validateStandards([additional]).success).toBe(false);
  });

  it.each([AccessibilityException.MicroEnterprises, AccessibilityException.FundamentalAlteration])(
    'rejects a WCAG standard together with EAA exception %s',
    (exception) => {
      const result = accessibilityValidationSchema.safeParse({
        accessibilityStandard: [AccessibilityStandard.Wcag22Aa],
        accessibilityException: exception,
        accessibilityReportUrl: '',
      });

      expect(result.success).toBe(false);
    },
  );

  it('accepts an EAA exception on its own, with a report URL', () => {
    expect(
      accessibilityValidationSchema.safeParse({
        accessibilityStandard: [],
        accessibilityException: AccessibilityException.DisproportionateBurden,
        accessibilityReportUrl: 'https://example.org/accessibility',
      }).success,
    ).toBe(true);
  });

  it('rejects a report URL that is no URL', () => {
    expect(
      accessibilityValidationSchema.safeParse({ accessibilityStandard: [], accessibilityReportUrl: 'not a url' })
        .success,
    ).toBe(false);
  });
});

describe('the accessibility slots the ordinary form offers (thoth-app#221)', () => {
  const WCAG = [
    AccessibilityStandard.Wcag21Aa,
    AccessibilityStandard.Wcag21Aaa,
    AccessibilityStandard.Wcag22Aa,
    AccessibilityStandard.Wcag22Aaa,
  ];

  it('offers WCAG alone as the primary standard, and EPUB Accessibility or PDF/UA alone as the additional one', () => {
    expect(accessibilityStandards).toEqual(WCAG);
    expect([...accessibilityAdditionalStandards].sort()).toEqual(
      [
        AccessibilityStandard.EpubA11Y10Aa,
        AccessibilityStandard.EpubA11Y10Aaa,
        AccessibilityStandard.EpubA11Y11Aa,
        AccessibilityStandard.EpubA11Y11Aaa,
        AccessibilityStandard.PdfUa1,
        AccessibilityStandard.PdfUa2,
      ].sort(),
    );
  });

  it.each([
    [PublicationType.Pdf, [...WCAG, AccessibilityStandard.PdfUa1, AccessibilityStandard.PdfUa2]],
    [
      PublicationType.Epub,
      [
        ...WCAG,
        AccessibilityStandard.EpubA11Y10Aa,
        AccessibilityStandard.EpubA11Y10Aaa,
        AccessibilityStandard.EpubA11Y11Aa,
        AccessibilityStandard.EpubA11Y11Aaa,
      ],
    ],
    [PublicationType.Html, WCAG],
    [PublicationType.Xml, WCAG],
    [PublicationType.Docx, WCAG],
    [PublicationType.Mobi, WCAG],
    [PublicationType.Azw3, WCAG],
    [PublicationType.FictionBook, WCAG],
    [PublicationType.Paperback, []],
    [PublicationType.Hardback, []],
    [PublicationType.Mp3, []],
    [PublicationType.Wav, []],
  ])('offers a %s Publication exactly the standards its database constraint allows', (type, expected) => {
    expect(getAccessibilityStandardOptions(type).map(({ value }) => value)).toEqual(expected);
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
