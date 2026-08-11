import z from 'zod';

import { appConfig } from '@/src/shared/config';
import { ERRORS, FORM_FIELDS } from '@/src/shared/constants';
import { getFileValidation, optionalStringValidation, optionalUrlValidation } from '@/src/shared/utils';
import { doiValidation, getRequiredStringValidation } from '@/src/shared/utils/validations';

const {
  ADDITIONAL_RESOURCE_TITLE,
  ADDITIONAL_RESOURCE_DESCRIPTION,
  ADDITIONAL_RESOURCE_ATTRIBUTION,
  ADDITIONAL_RESOURCE_RESOURCE_TYPE,
  ADDITIONAL_RESOURCE_HANDLE,
  ADDITIONAL_RESOURCE_URL,
  DOI,
} = FORM_FIELDS;

export const additionalResourceTitleValidationSchema = z.object({
  [ADDITIONAL_RESOURCE_TITLE.name]: getRequiredStringValidation(),
});

export const additionalResourceDescriptionValidationSchema = z.object({
  [ADDITIONAL_RESOURCE_DESCRIPTION.name]: optionalStringValidation,
});

export const additionalResourceAttributionValidationSchema = z.object({
  [ADDITIONAL_RESOURCE_ATTRIBUTION.name]: optionalStringValidation,
});

export const additionalResourceResourceTypeValidationSchema = z.object({
  [ADDITIONAL_RESOURCE_RESOURCE_TYPE.name]: getRequiredStringValidation(),
});

export const additionalResourceHandleValidationSchema = z.object({
  [ADDITIONAL_RESOURCE_HANDLE.name]: optionalStringValidation,
});

export const additionalResourceUrlValidationSchema = z.object({
  [ADDITIONAL_RESOURCE_URL.name]: optionalUrlValidation,
});

export const additionalResourceDoiValidationSchema = z.object({
  [DOI.name]: doiValidation,
});

export const getSupportedAdditionalResourceFileTypes = (resourceType: string) =>
  appConfig.additionalResourceFileTypesByResourceType[resourceType] ?? [];

export const getAdditionalResourceFileValidationSchema = (resourceType: string) =>
  z.object({
    file: getFileValidation(
      appConfig.minFileSize,
      appConfig.maxAdditionalResourceFileSize,
      getSupportedAdditionalResourceFileTypes(resourceType),
      ERRORS.FILE_FORMAT_INVALID,
      ERRORS.MAX_FILE_SIZE_EXCEEDED,
      ERRORS.MIN_FILE_SIZE_NOT_MET,
    ),
  });
