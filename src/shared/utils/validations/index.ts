import dayjs from 'dayjs';
import isbn3 from 'isbn3';
import { orcid } from 'orcid';
import z from 'zod';

import { MarkupFormat } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { AccessibilityExceptions, AccessibilityStandards, ContributorTypes, ERRORS } from '@/src/shared/constants';
import { ContactTypes } from '@/src/shared/constants/accessibility';
import { CurrencyCode } from '@/src/shared/constants/currencies';
import { LanguageRelation, LanguageTypeAlt } from '@/src/shared/constants/languages';
import { LengthUnit, WeightUnit } from '@/src/shared/constants/lengths';
import { LocationPlatforms } from '@/src/shared/constants/locations';
import { PublicationType } from '@/src/shared/constants/publications';
import { SeriesType } from '@/src/shared/constants/series';
import { SubjectTypes } from '@/src/shared/constants/subjects';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';
import type { ErrorMessage } from '@/src/shared/interfaces';

const { orcidPrefix } = appConfig.validations;

const doiPattern = /^https:\/\/doi\.org\/10\.\d{4,9}\/[-._;()\/:a-zA-Z0-9<>+[\]]+$/;
const issnPattern = /^\d{4}-\d{3}[\dX]$/;
const rorPattern = /^https:\/\/ror\.org\/0[a-hjkmnp-z0-9]{6}\d{2}$/;

const { INVALID_URL } = ERRORS;

/* String Validations */
export const getStringValidation = (errorMessage?: ErrorMessage, maxLength?: number) => {
  let schema = z.string({ message: errorMessage });
  if (maxLength) schema = schema.max(maxLength, { message: errorMessage });
  return schema;
};

export const getRequiredStringValidation = (errorMessage?: ErrorMessage, maxLength?: number) => {
  let schema = getStringValidation(errorMessage).nonempty({ message: errorMessage });
  if (maxLength) schema = schema.max(maxLength, { message: errorMessage });
  return schema;
};

export const optionalStringValidation = getStringValidation().optional();

/* Integer Validations */
export const intValidation = z.coerce
  .number()
  .min(-Math.pow(2, 31))
  .max(Math.pow(2, 31) - 1);

export const requiredIntValidation = intValidation.nonoptional();

export const positiveIntValidation = z.coerce.number().nonnegative().min(0.01);

export const optionalPositiveIntValidation = z.coerce.number().nonnegative().optional();

/* Date Validations */
export const dateValidation = z.refine((date) => isValidDate(`${date}`));

export const optionalDateValidation = z.refine((date) => {
  if (!date) return true;

  return isValidDate(`${date}`);
});

export const timestampValidation = z.iso.datetime();

export const createdAtValidation = timestampValidation;
export const updatedAtValidation = timestampValidation;

/* Enums Validations */
export const workTypeValidation = z.enum(WorkTypes.enum);
export const workStatusValidation = z.enum(WorkStatuses.enum);
export const languageValidation = z.enum(LanguageTypeAlt.enum);
export const contributorType = z.enum(ContributorTypes.enum);
export const languageRelationValidation = z.enum(LanguageRelation.enum);
export const publicationTypeValidation = z.enum(PublicationType.enum);
export const lengthUnitValidation = z.enum(LengthUnit.enum);
export const weightUnitValidation = z.enum(WeightUnit.enum);
export const currencyCodeValidation = z.enum(CurrencyCode.enum);
export const locationPlatformValidation = z.enum(LocationPlatforms.enum);
export const subjectTypeValidation = z.enum(SubjectTypes.enum);
export const seriesTypeValidation = z.enum(SeriesType.enum);
export const contactTypeValidation = z.enum(ContactTypes.enum);
export const accessibilityStandardValidation = z.enum(AccessibilityStandards.enum);
export const accessibilityExceptionValidation = z.enum(AccessibilityExceptions.enum);

/* URL Validations */
export const getUrlValidation = (errorMessage?: ErrorMessage) => z.url({ message: errorMessage });

export const optionalUrlValidation = getUrlValidation().optional().or(z.literal(''));
export const getRequiredUrlValidation = (errorMessage?: ErrorMessage) =>
  getUrlValidation(errorMessage ?? INVALID_URL).nonempty({ message: errorMessage ?? INVALID_URL });
export const doiValidation = optionalUrlValidation.refine(
  (doi) => {
    if (!doi) return true;

    return doiPattern.test(doi);
  },
  { message: 'Invalid DOI format (expected https://doi.org/10.xxxx/xxxxx)' },
);

/**
 * The resolver forms Thoth's API accepts in front of a DOI.
 *
 * `Doi::from_str` in `thoth-api/src/model/mod.rs` matches
 * `[[http[s]://][www.][dx.]doi.org/]10.XXXX/XXX` case-insensitively, keeps the identifier from
 * `10.` onwards and stores it behind the canonical `https://doi.org/`. Anything else is a parse
 * error, so this is the exact set of prefixes an importer may strip.
 */
const doiResolverPattern = /^(?:https?:\/\/)?(?:www\.)?(?:dx\.)?doi\.org\//i;

/**
 * A DOI in the single form Thoth stores, or an empty string when the value is not a DOI at all.
 *
 * Importers receive DOIs in whichever form their source writes them — bare `10.…`, the canonical
 * resolver URL, or one of the older `dx.doi.org` and `www.doi.org` variants — and Thoth stores
 * exactly one of those. Concatenating a prefix onto whatever arrived is not enough: it turns a
 * publisher's product code into `https://doi.org/PROD-1234`, which looks like a DOI all the way
 * to the API and fails there. The value is therefore canonicalised first and then held to the
 * same grammar {@link doiValidation} enforces, which is the app's copy of the API's.
 */
export const canonicaliseDoi = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.length === 0) return '';

  const canonical = `${appConfig.validations.doiPrefix}${trimmed.replace(doiResolverPattern, '')}`;

  return doiPattern.test(canonical) ? canonical : '';
};

/**
 * The resolver forms Thoth's API accepts in front of a ROR identifier.
 *
 * `Ror::from_str` in `thoth-api/src/model/mod.rs` matches
 * `[[[http[s]://]|[https://www.]]ror.org/]0XXXXXXNN` with a case-insensitive resolver, keeps the
 * identifier and stores it behind the canonical `https://ror.org/`. The identifier itself is
 * case-sensitive lowercase, exactly as in the API's pattern.
 */
const rorResolverPattern = /^(?:https?:\/\/|https:\/\/www\.)?ror\.org\//i;
const rorIdentifierPattern = /^0[a-hjkmnp-z0-9]{6}\d{2}$/;

/**
 * A ROR in the single form Thoth stores, or an empty string when the value is not a ROR at all.
 *
 * The importer counterpart of {@link canonicaliseDoi}: institutions in Thoth carry the canonical
 * `https://ror.org/…` URL, so a bare identifier that is never canonicalised can pass a shape
 * check and still match no institution. Canonicalising first means the value that is validated
 * is the value that is looked up and imported.
 */
export const canonicaliseRor = (value: string): string => {
  const identifier = value.trim().replace(rorResolverPattern, '');

  return rorIdentifierPattern.test(identifier) ? `${appConfig.validations.rorPrefix}${identifier}` : '';
};

/* External Identifiers Validations */
export const idValidation = z.uuid();
export const orcidValidation = getStringValidation()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;

      return value.startsWith(orcidPrefix)
        ? orcid.validate(value)
        : orcid.validate(appConfig.validations.orcidPrefix + value);
    },
    {
      message: 'Invalid ORCID ID (0000-0000-0000-0000 or 0000-0000-0000-000X)',
    },
  );
export const rorValidation = getStringValidation().refine((ror) => rorPattern.test(ror), {
  message: 'Invalid ROR ID format (expected https://ror.org/0xxxxxxx)',
});

export const issnValidation = optionalStringValidation.refine(
  (issn) => {
    if (!issn) return true;

    return issnPattern.test(issn);
  },
  { message: 'Invalid ISSN format (expected XXXX-XXXX or XXXX-XXX X)' },
);

export const pageBreakdownValidation = optionalStringValidation;

export const isbnValidation = optionalStringValidation
  .refine(
    (isbn) => {
      if (!isbn) return true;

      return isbn3.parse(isbn)?.isValid ?? false;
    },
    {
      message: 'Invalid ISBN',
    },
  )
  .transform((isbn) => {
    if (!isbn) return isbn;

    const parsed = isbn3.parse(isbn);

    return parsed?.isbn13h ?? isbn;
  });

export const isValidDate = (date: string) => dayjs(date).isValid();

export const isDayJsInstance = (date: unknown) => dayjs.isDayjs(date);

const romanRegex = new RegExp(/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/);

export const romanNumeralValidation = z.string().toUpperCase().regex(romanRegex, 'Invalid Roman Numeral format');

export const romanNumeralValidationOptional = romanNumeralValidation.optional();

export const numberOrRomanNumeralValidation = z.string().refine(
  (value) => {
    if (value.length === 0) return true;

    const numValue = Number(value);

    if (Number.isInteger(numValue) && numValue >= 1) {
      return true;
    }

    return romanRegex.test(value.toUpperCase());
  },
  {
    message: 'Must be a valid positive number or Roman numeral',
  },
);

export const numberOrRomanNumeralValidationOptional = numberOrRomanNumeralValidation.optional();

export const uuidValidation = z.uuid();

/**
 * A non-empty browser MIME type is authoritative: a file whose type is a known
 * unsupported MIME is rejected even when its name looks supported. Some
 * browser/OS combinations report `File.type` as '' for legitimate formats
 * (notably MOBI, AZW3 and FictionBook); only then does the filename extension
 * decide, against an explicit allowlist so unknown files are still rejected.
 */
const isSupportedFileFormat = (file: File, filesFormat: Array<string>, filesExtensions?: Array<string>) => {
  if (file.type !== '' || !filesExtensions) return filesFormat.includes(file.type);

  const fileName = file.name.toLowerCase();

  return filesExtensions.some((extension) => fileName.endsWith(extension));
};

export const getFileValidation = (
  minFileSize: number,
  maxFileSize: number,
  filesFormat: Array<string>,
  formatErrMessage?: ErrorMessage,
  maxFileSizeErrMessage?: ErrorMessage,
  minFileSizeErrMessage?: ErrorMessage,
  filesExtensions?: Array<string>,
) =>
  z
    .custom<FileList | undefined>()
    .refine((files) => files && files[0] && files[0].size >= minFileSize, minFileSizeErrMessage)
    .refine((files) => files && files[0] && files[0].size <= maxFileSize, maxFileSizeErrMessage)
    .refine(
      (files) => files && files[0] && isSupportedFileFormat(files[0], filesFormat, filesExtensions),
      formatErrMessage,
    );

export const isJpegCoverFile = async (file: File): Promise<boolean> => {
  const name = file.name.toLowerCase();
  const hasJpegExtension = appConfig.supportedCoverImageExtensions.some((extension) => name.endsWith(extension));

  if (!hasJpegExtension) return false;
  // A non-empty browser MIME type must be exactly image/jpeg.
  if (file.type !== '' && !appConfig.supportedCoverImageMimeTypes.includes(file.type)) return false;

  // Verify JPEG magic bytes (SOI marker FF D8 FF).
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, 3);

  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
};

/**
 * Work-cover-specific validation: JPEG only.
 *
 * Deliberately separate from getFileValidation so publication files and
 * additional resources keep their existing MIME-list behaviour.
 */
export const getCoverImageFileValidation = (
  minFileSize: number,
  maxFileSize: number,
  formatErrMessage?: ErrorMessage,
  maxFileSizeErrMessage?: ErrorMessage,
  minFileSizeErrMessage?: ErrorMessage,
) =>
  z
    .custom<FileList | undefined>()
    .refine((files) => files && files[0] && files[0].size >= minFileSize, minFileSizeErrMessage)
    .refine((files) => files && files[0] && files[0].size <= maxFileSize, maxFileSizeErrMessage)
    .refine(async (files) => files && files[0] && (await isJpegCoverFile(files[0])), formatErrMessage);

export const emailValidation = z.email();

export const getMarkupFormat = (markupFormat: unknown) => {
  if (markupFormat === MarkupFormat.JatsXml || markupFormat === MarkupFormat.PlainText) {
    return markupFormat;
  }

  return MarkupFormat.JatsXml;
};
