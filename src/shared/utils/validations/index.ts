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

const { doiPrefix, rorPrefix, orcidPrefix } = appConfig.validations;

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
export const rorValidation = getStringValidation().refine(
  (ror) => rorPattern.test(ror),
  { message: 'Invalid ROR ID format (expected https://ror.org/0xxxxxxx)' },
);

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

export const getFileValidation = (
  minFileSize: number,
  maxFileSize: number,
  filesFormat: Array<string>,
  formatErrMessage?: ErrorMessage,
  maxFileSizeErrMessage?: ErrorMessage,
  minFileSizeErrMessage?: ErrorMessage,
) =>
  z
    .custom<FileList | undefined>()
    .refine((files) => files && files[0] && files[0].size >= minFileSize, minFileSizeErrMessage)
    .refine((files) => files && files[0] && files[0].size <= maxFileSize, maxFileSizeErrMessage)
    .refine((files) => files && filesFormat.includes(files[0].type), formatErrMessage);

export const emailValidation = z.email();

export const getMarkupFormat = (markupFormat: unknown) => {
  if (markupFormat === MarkupFormat.JatsXml || markupFormat === MarkupFormat.PlainText) {
    return markupFormat;
  }

  return MarkupFormat.JatsXml;
};
