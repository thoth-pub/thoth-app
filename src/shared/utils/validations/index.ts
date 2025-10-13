import dayjs from 'dayjs';
import isbn3 from 'isbn3';
import { orcid } from 'orcid';
import z from 'zod';

import { appConfig } from '@/src/shared/config';
import {
  ContributorTypes,
  CurrencyCode,
  ERRORS,
  LanguageRelation,
  LanguageTypeAlt,
  LengthUnit,
  LocationPlatforms,
  PublicationType,
  WeightUnit,
  WorkStatuses,
} from '@/src/shared/constants';
import type { ErrorMessage } from '@/src/shared/interfaces';

const { doiPrefix, rorPrefix } = appConfig.validations;

const { INVALID_URL } = ERRORS;

/* String Validations */
export const getStringValidation = (errorMessage?: ErrorMessage) => z.string({ message: errorMessage });

export const getRequiredStringValidation = (errorMessage?: ErrorMessage) =>
  getStringValidation(errorMessage).nonempty({ message: errorMessage });

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
export const workStatusValidation = z.enum(WorkStatuses.enum);
export const languageValidation = z.enum(LanguageTypeAlt.enum);
export const contributorType = z.enum(ContributorTypes.enum);
export const languageRelationValidation = z.enum(LanguageRelation.enum);
export const publicationTypeValidation = z.enum(PublicationType.enum);
export const lengthUnitValidation = z.enum(LengthUnit.enum);
export const weightUnitValidation = z.enum(WeightUnit.enum);
export const currencyCodeValidation = z.enum(CurrencyCode.enum);
export const locationPlatformValidation = z.enum(LocationPlatforms.enum);

/* URL Validations */
export const getUrlValidation = (errorMessage?: ErrorMessage) => z.url({ message: errorMessage });

export const optionalUrlValidation = getUrlValidation().optional().or(z.literal(''));
export const getRequiredUrlValidation = (errorMessage?: ErrorMessage) =>
  getUrlValidation(errorMessage ?? INVALID_URL).nonempty({ message: errorMessage ?? INVALID_URL });
export const doiValidation = optionalUrlValidation.refine((doi) => {
  if (!doi) return true;

  return doi.startsWith(doiPrefix);
});

/* External Identifiers Validations */
export const idValidation = z.uuid();
export const orcidValidation = getStringValidation()
  .optional()
  .refine((value) => (value ? orcid.validate(appConfig.validations.orcidPrefix + value) : true), {
    message: 'Invalid ORCID ID (0000-0000-0000-0000 or 0000-0000-0000-000X)',
  });
export const rorValidation = getStringValidation().refine((ror) => ror.startsWith(rorPrefix));

export const issnValidation = optionalStringValidation.refine((issn) => {
  if (!issn) return true;

  return issn
    .replaceAll('-', '')
    .split('')
    .every((char) => Number.isInteger(Number(char)));
});

export const pageBreakdownValidation = optionalStringValidation;

export const isbnValidation = optionalStringValidation.refine(
  (isbn) => {
    if (!isbn) return true;

    return isbn3.parse(isbn)?.isValid ?? false;
  },
  {
    message: 'Invalid ISBN',
  },
);

export const isValidDate = (date: string) => dayjs(date).isValid();

export const isDayJsInstance = (date: unknown) => dayjs.isDayjs(date);

const romanRegex = new RegExp(/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/);

export const romanNumeralValidation = z.string().toUpperCase().regex(romanRegex, 'Invalid Roman Numeral format');

export const romanNumeralValidationOptional = romanNumeralValidation.optional();

export const uuidValidation = z.uuid();
