import isbn3 from 'isbn3';
import z from 'zod';

import { config } from '@/config';

const { doiPrefix, rorPrefix, orcidPrefix } = config.validations;

/* String Validations */
export const stringValidation = z.string();

export const requiredStingValidation = stringValidation.nonempty();

export const optionalStringValidation = stringValidation.optional();

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
export const urlValidation = z.url();

export const optionalUrlValidation = urlValidation.optional();

/* External Identifiers Validations */
export const idValidation = z.uuid();
export const doiValidation = stringValidation.refine((doi) => doi.startsWith(doiPrefix));
export const orcidValidation = stringValidation.refine((orcid) => orcid.startsWith(orcidPrefix));
export const rorValidation = stringValidation.refine((ror) => ror.startsWith(rorPrefix));

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
