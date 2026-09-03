import z from 'zod';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants';
import { ERRORS } from '@/src/shared/constants/errors';
import { interpretPageRange, isPageLabel, type PageRangeStatus } from '@/src/shared/utils/helpers/pages';
import {
  doiValidation,
  getCoverImageFileValidation,
  getRequiredStringValidation,
  getStringValidation,
  languageValidation,
  optionalDateValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  workStatusValidation,
} from '@/src/shared/utils/validations';

const {
  DOI,
  TITLE,
  LICENSE,
  IMPRINT,
  WORK_TYPE,
  TITLE_LANGUAGE,
  WORK_STATUS,
  PUBLICATION_DATE,
  WORK_TITLE,
  EDITION,
  COPYRIGHT_HOLDER,
  LANDING_PAGE,
  INTERNAL_ID,
  COVER_URL,
  SUBTITLE,
  LANGUAGE,
  TITLES,
  WORK_IMAGE_COUNT,
  WORK_TABLE_COUNT,
  WORK_AUDIO_COUNT,
  WORK_VIDEO_COUNT,
  WORK_PAGES_COUNT,
  WORK_FRONTMATTER_COUNT,
  WORK_BACKMATTER_COUNT,
  WORK_FIRST_PAGE,
  WORK_LAST_PAGE,
  WORK_GENERAL_NOTE,
  WORK_BIBLIOGRAPHY_NOTE,
  WORK_COPY,
  WORK_ABSTRACT,
  WORK_SHORT_ABSTRACT,
  WORK_ABSTRACTS,
  LCCN,
  OCLC,
  PLACE,
} = FORM_FIELDS;

export const titleValidation = getRequiredStringValidation(TITLE.errorMessage);
export const imprintValidation = getRequiredStringValidation(IMPRINT.errorMessage);
export const workTypeValidation = getRequiredStringValidation(WORK_TYPE.errorMessage);
export const titleLanguageCodeValidation = languageValidation;

export const publicationDateValidation = optionalDateValidation;

export const subtitleValidation = optionalStringValidation;

export const editionValidation = optionalPositiveIntValidation;

const pagesCountValidation = optionalPositiveIntValidation;

const imageCountValidation = optionalPositiveIntValidation;

const tableCountValidation = optionalPositiveIntValidation;

const audioCountValidation = optionalPositiveIntValidation;

const videoCountValidation = optionalPositiveIntValidation;

const licenseValidation = z.object({
  value: getStringValidation(),
});

const copyrightHolderValidation = optionalStringValidation;

const landingPageValidation = optionalUrlValidation;

const frontMatterCountValidation = optionalPositiveIntValidation;

const backMatterCountValidation = optionalPositiveIntValidation;

/*
 * Page fields are validated through the shared page-range interpretation in
 * `src/shared/utils/helpers/pages` rather than through the generic
 * `numberOrRomanNumeralValidationOptional`, which knows nothing of prefixed labels and judges each
 * endpoint on its own. Reading both fields through one interpretation is what keeps the rules this
 * form enforces and the rules the automatic page count applies from drifting apart.
 */

/** Names every supported convention, so the message never implies a free-text page label. */
const PAGE_LABEL_ERROR =
  'Must be a positive number (1), a Roman numeral (IV), or one uppercase letter followed by a positive number (A1)';

/**
 * The pair failures, each with the field a correction belongs on. Cross-field failures point at the
 * last page: the first page is the endpoint the range is read from, so it is the last page the user
 * has to reconcile with it.
 */
const PAGE_RANGE_PAIR_ERRORS: Partial<Record<PageRangeStatus, string>> = {
  incompatibleSchemes: 'First and last page must use the same numbering (1–20, I–XI, A1–20 or A1–A20)',
  prefixMismatch: 'First and last page must use the same prefix (A1–A20)',
  descending: 'Last page must not come before first page',
};

const pageLabelValidation = optionalStringValidation.refine((value) => !value || isPageLabel(value), {
  message: PAGE_LABEL_ERROR,
});

const firstPageValidation = pageLabelValidation;

const lastPageValidation = pageLabelValidation;

const titleLanguageValidation = z.object({
  value: languageValidation,
  label: getRequiredStringValidation(),
});

export const createWorkValidationSchema = z.object({
  [TITLE.name]: titleValidation,
  [TITLE_LANGUAGE.name]: titleLanguageCodeValidation,
  [IMPRINT.name]: imprintValidation,
  [WORK_TYPE.name]: workTypeValidation,
});

export const titleValidationSchema = z.object({
  [WORK_TITLE.name]: titleValidation,
  [SUBTITLE.name]: subtitleValidation,
  [LANGUAGE.name]: titleLanguageValidation,
});

export const workTitlesValidationSchema = z.object({
  [TITLES.name]: z.array(
    z.object({
      titleId: getRequiredStringValidation(),
      [WORK_TITLE.name]: titleValidation,
      [SUBTITLE.name]: subtitleValidation,
      [LANGUAGE.name]: titleLanguageValidation,
    }),
  ),
  [EDITION.name]: editionValidation,
});

export const publicationDateValidationSchema = z.object({
  [PUBLICATION_DATE.name]: publicationDateValidation,
});

export const workStatusValidationSchema = z.object({
  [WORK_STATUS.name]: workStatusValidation,
});

export const editionValidationSchema = z.object({
  [EDITION.name]: editionValidation,
});

export const workTypeValidationSchema = z.object({
  [WORK_TYPE.name]: workTypeValidation,
});

export const imprintValidationSchema = z.object({
  [IMPRINT.name]: imprintValidation,
  [PLACE.name]: optionalStringValidation,
});

export const internalIdValidationSchema = z.object({
  [INTERNAL_ID.name]: optionalStringValidation,
});

export const landingPageValidationSchema = z.object({
  [LANDING_PAGE.name]: landingPageValidation,
});

export const lccnValidationSchema = z.object({
  [LCCN.name]: optionalStringValidation,
});

export const oclcValidationSchema = z.object({
  [OCLC.name]: optionalStringValidation,
});

export const licenseAndCopyrightHolderValidationSchema = z.object({
  [LICENSE.name]: licenseValidation,
  [COPYRIGHT_HOLDER.name]: copyrightHolderValidation,
});

export const doiAndCoversValidationSchema = z.object({
  [DOI.name]: doiValidation,
  [LANDING_PAGE.name]: landingPageValidation,
});

export const mediaValidationSchema = z.object({
  [WORK_IMAGE_COUNT.name]: imageCountValidation,
  [WORK_TABLE_COUNT.name]: tableCountValidation,
  [WORK_AUDIO_COUNT.name]: audioCountValidation,
  [WORK_VIDEO_COUNT.name]: videoCountValidation,
});

export const pagesCountValidationSchema = z
  .object({
    [WORK_PAGES_COUNT.name]: pagesCountValidation,
    [WORK_FRONTMATTER_COUNT.name]: frontMatterCountValidation,
    [WORK_BACKMATTER_COUNT.name]: backMatterCountValidation,
    [WORK_FIRST_PAGE.name]: firstPageValidation,
    [WORK_LAST_PAGE.name]: lastPageValidation,
  })
  .superRefine((values, ctx) => {
    const { status } = interpretPageRange(values[WORK_FIRST_PAGE.name], values[WORK_LAST_PAGE.name]);
    const message = PAGE_RANGE_PAIR_ERRORS[status];

    // An endpoint that is not a valid label on its own has already been reported against its own
    // field, and an incomplete range has no pair to check.
    if (!message) return;

    ctx.addIssue({ code: 'custom', message, path: [WORK_LAST_PAGE.name] });
  });

export const coverUrlValidationSchema = z.object({
  [COVER_URL.name]: getCoverImageFileValidation(
    appConfig.minFileSize,
    appConfig.maxFileSize,
    ERRORS.COVER_IMAGE_MUST_BE_JPEG,
    ERRORS.MAX_FILE_SIZE_EXCEEDED,
    ERRORS.MIN_FILE_SIZE_NOT_MET,
  ),
});

export const coverUrlAltValidationSchema = z.object({
  [COVER_URL.name]: optionalUrlValidation,
});

export const notesValidationSchema = z.object({
  [WORK_GENERAL_NOTE.name]: optionalStringValidation,
  [WORK_BIBLIOGRAPHY_NOTE.name]: optionalStringValidation,
});

export const workCopyValidationSchema = z.object({
  [WORK_COPY.name]: z.object({
    value: getRequiredStringValidation(),
    label: getRequiredStringValidation(),
  }),
});

export const workAbstractsValidationSchema = z.object({
  [WORK_ABSTRACTS.name]: z.array(
    z.object({
      longAbstractId: getRequiredStringValidation(),
      shortAbstractId: getRequiredStringValidation(),
      [WORK_ABSTRACT.name]: optionalStringValidation,
      [WORK_SHORT_ABSTRACT.name]: optionalStringValidation,
      [LANGUAGE.name]: titleLanguageValidation,
    }),
  ),
});
