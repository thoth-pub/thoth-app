import z from 'zod';

import { appConfig } from '@/src/shared/config';
import { ERRORS, FORM_FIELDS } from '@/src/shared/constants';
import { getFileValidation, getRequiredStringValidation, optionalUrlValidation } from '@/src/shared/utils';

const { FEATURED_VIDEO_TITLE, FEATURED_VIDEO_URL, FEATURED_VIDEO_WIDTH, FEATURED_VIDEO_HEIGHT } = FORM_FIELDS;

export const featuredVideoTitleValidationSchema = z.object({
  [FEATURED_VIDEO_TITLE.name]: getRequiredStringValidation(),
});

export const featuredVideoUrlValidationSchema = z.object({
  [FEATURED_VIDEO_URL.name]: optionalUrlValidation,
});

export const featuredVideoWidthValidationSchema = z.object({
  [FEATURED_VIDEO_WIDTH.name]: z.coerce.number().int().positive(),
});

export const featuredVideoHeightValidationSchema = z.object({
  [FEATURED_VIDEO_HEIGHT.name]: z.coerce.number().int().positive(),
});

export const featuredVideoFileValidationSchema = z.object({
  file: getFileValidation(
    appConfig.minFileSize,
    appConfig.maxFeaturedVideoFileSize,
    appConfig.supportedVideoFileTypes,
    ERRORS.FILE_FORMAT_INVALID,
    ERRORS.MAX_FILE_SIZE_EXCEEDED,
    ERRORS.MIN_FILE_SIZE_NOT_MET,
  ),
});
