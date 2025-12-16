import z from 'zod';

import { ERRORS, getStringValidation, numberOrRomanNumeralValidationOptional } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  doiValidation,
  getFileValidation,
  getRequiredStringValidation,
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

const firstPageValidation = numberOrRomanNumeralValidationOptional;

const lastPageValidation = numberOrRomanNumeralValidationOptional;

const titleLanguageValidation = z.object({
  value: languageValidation,
  label: getRequiredStringValidation(),
});

export const createWorkValidationSchema = z.object({
  [TITLE.name]: titleValidation,
  [TITLE_LANGUAGE.name]: titleLanguageCodeValidation,
  [IMPRINT.name]: imprintValidation,
  [WORK_TYPE.name]: workTypeValidation,
  [LICENSE.name]: licenseValidation,
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

export const pagesCountValidationSchema = z.object({
  [WORK_PAGES_COUNT.name]: pagesCountValidation,
  [WORK_FRONTMATTER_COUNT.name]: frontMatterCountValidation,
  [WORK_BACKMATTER_COUNT.name]: backMatterCountValidation,
  [WORK_FIRST_PAGE.name]: firstPageValidation,
  [WORK_LAST_PAGE.name]: lastPageValidation,
});

export const coverUrlValidationSchema = z.object({
  [COVER_URL.name]: getFileValidation(
    appConfig.supportedFileTypes,
    ERRORS.FILE_FORMAT_INVALID,
    ERRORS.MAX_FILE_SIZE_EXCEEDED,
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
      abstractId: getRequiredStringValidation(),
      [WORK_ABSTRACT.name]: optionalStringValidation,
      [WORK_SHORT_ABSTRACT.name]: optionalStringValidation,
      [LANGUAGE.name]: titleLanguageValidation,
    }),
  ),
});
