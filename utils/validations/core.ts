import isbn3 from 'isbn3';
import z from 'zod';

import { config } from '@/config';
import { ERRORS } from '@/constants';

const { doiPrefix, rorPrefix, orcidPrefix } = config.validations;

const { URL } = ERRORS;

/* String Validations */
export const getStringValidation = (errorMessage?: string) => z.string({ message: errorMessage });

export const getRequiredStringValidation = (errorMessage?: string) =>
  getStringValidation(errorMessage).nonempty({ message: errorMessage });

export const optionalStringValidation = getStringValidation().optional();

/* Integer Validations */
export const intValidation = z
  .number()
  .min(-Math.pow(2, 31))
  .max(Math.pow(2, 31) - 1);

export const requiredIntValidation = intValidation.nonoptional();

export const optionalIntValidation = intValidation.optional();

export const positiveIntValidation = intValidation.min(1);

export const optionalPositiveIntValidation = positiveIntValidation.optional();

/* Date Validations */
export const dateValidation = z.date();

export const timestampValidation = z.iso.datetime();

export const createdAtValidation = timestampValidation;
export const updatedAtValidation = timestampValidation;

/* URL Validations */
export const getUrlValidation = (errorMessage?: string) => z.url({ message: errorMessage });

export const optionalUrlValidation = getUrlValidation().optional();
export const getRequiredUrlValidation = (errorMessage?: string) =>
  getUrlValidation(errorMessage ?? URL).nonempty({ message: errorMessage ?? URL });

/* External Identifiers Validations */
export const idValidation = z.uuid();
export const doiValidation = getStringValidation().refine((doi) => doi.startsWith(doiPrefix));
export const orcidValidation = getStringValidation().refine((orcid) => orcid.startsWith(orcidPrefix));
export const rorValidation = getStringValidation().refine((ror) => ror.startsWith(rorPrefix));

export const issnValidation = optionalStringValidation.refine((issn) => {
  if (!issn) return true;

  return issn
    .replaceAll('-', '')
    .split('')
    .every((char) => Number.isInteger(Number(char)));
});

export const pageBreakdownValidation = optionalStringValidation;

export const isbnValidation = optionalStringValidation.refine((isbn) => {
  if (!isbn) return true;

  return isbn3.parse(isbn)?.isValid ?? false;
});
