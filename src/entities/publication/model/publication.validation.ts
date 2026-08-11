import z from 'zod';

import { appConfig } from '@/src/shared/config';
import {
  accessibilityAdditionalStandards,
  accessibilityStandards,
  ERRORS,
  FORM_FIELDS,
  PublicationType as PublicationTypeEnum,
} from '@/src/shared/constants';
import {
  accessibilityExceptionValidation,
  accessibilityStandardValidation,
  getFileValidation,
  isbnValidation,
  optionalPositiveIntValidation,
  optionalUrlValidation,
  publicationTypeValidation,
} from '@/src/shared/utils';

const {
  supportedPdfFileTypes,
  supportedEpubFileTypes,
  supportedHtmlFileTypes,
  supportedXmlFileTypes,
  supportedDocxFileTypes,
  supportedMobiFileTypes,
  supportedAzw3FileTypes,
  supportedFictionBookFileTypes,
  supportedMP3FileTypes,
  supportedWavFileTypes,
} = appConfig;

const {
  PUBLICATION_TYPE,
  PUBLICATION_ISBN,
  PUBLICATION_WIDTH_MM,
  PUBLICATION_WIDTH_IN,
  PUBLICATION_HEIGHT_MM,
  PUBLICATION_HEIGHT_IN,
  PUBLICATION_DEPTH_MM,
  PUBLICATION_DEPTH_IN,
  PUBLICATION_WEIGHT_G,
  PUBLICATION_WEIGHT_OZ,
  PUBLICATION_ACCESSIBILITY_STANDARD,
  PUBLICATION_ACCESSIBILITY_EXCEPTION,
  PUBLICATION_ACCESSIBILITY_REPORT_URL,
  PUBLICATION_FILE,
} = FORM_FIELDS;

const widthValidation = optionalPositiveIntValidation;
const heightValidation = optionalPositiveIntValidation;
const depthValidation = optionalPositiveIntValidation;
const weightValidation = optionalPositiveIntValidation;

const allSupportedPublicationFileTypes = [
  ...supportedPdfFileTypes,
  ...supportedEpubFileTypes,
  ...supportedHtmlFileTypes,
  ...supportedXmlFileTypes,
  ...supportedDocxFileTypes,
  ...supportedMobiFileTypes,
  ...supportedAzw3FileTypes,
  ...supportedFictionBookFileTypes,
  ...supportedMP3FileTypes,
  ...supportedWavFileTypes,
];

export const getSupportedPublicationFileTypes = (publicationType: string) => {
  switch (publicationType) {
    case PublicationTypeEnum.enum.Pdf:
      return supportedPdfFileTypes;
    case PublicationTypeEnum.enum.Epub:
      return supportedEpubFileTypes;
    case PublicationTypeEnum.enum.Html:
      return supportedHtmlFileTypes;
    case PublicationTypeEnum.enum.Xml:
      return supportedXmlFileTypes;
    case PublicationTypeEnum.enum.Docx:
      return supportedDocxFileTypes;
    case PublicationTypeEnum.enum.Mobi:
      return supportedMobiFileTypes;
    case PublicationTypeEnum.enum.Azw3:
      return supportedAzw3FileTypes;
    case PublicationTypeEnum.enum.FictionBook:
      return supportedFictionBookFileTypes;
    case PublicationTypeEnum.enum.Mp3:
      return supportedMP3FileTypes;
    case PublicationTypeEnum.enum.Wav:
      return supportedWavFileTypes;
    default:
      return allSupportedPublicationFileTypes;
  }
};

export const getPublicationFileValidationSchema = (publicationType: string) =>
  z.object({
    [PUBLICATION_FILE.name]: getFileValidation(
      appConfig.minFileSize,
      appConfig.maxPublicationFileSize,
      getSupportedPublicationFileTypes(publicationType),
      ERRORS.FILE_FORMAT_INVALID,
      ERRORS.MAX_FILE_SIZE_EXCEEDED,
      ERRORS.MIN_FILE_SIZE_NOT_MET,
    ),
  });

export const publicationTypeValidationSchema = z.object({ [PUBLICATION_TYPE.name]: publicationTypeValidation });

export const isbnValidationSchema = z.object({ [PUBLICATION_ISBN.name]: isbnValidation });

export const dimensionsValidationSchema = z.object({
  [PUBLICATION_WIDTH_MM.name]: widthValidation,
  [PUBLICATION_WIDTH_IN.name]: widthValidation,
  [PUBLICATION_HEIGHT_MM.name]: heightValidation,
  [PUBLICATION_HEIGHT_IN.name]: heightValidation,
  [PUBLICATION_DEPTH_MM.name]: depthValidation,
  [PUBLICATION_DEPTH_IN.name]: depthValidation,
  [PUBLICATION_WEIGHT_G.name]: weightValidation,
  [PUBLICATION_WEIGHT_OZ.name]: weightValidation,
});

export const accessibilityStandardValidationSchema = z.object({
  [PUBLICATION_ACCESSIBILITY_STANDARD.name]: z.array(accessibilityStandardValidation).min(0),
});

export const accessibilityExceptionValidationSchema = z.object({
  [PUBLICATION_ACCESSIBILITY_EXCEPTION.name]: accessibilityExceptionValidation,
});

export const accessibilityReportUrlValidationSchema = z.object({
  [PUBLICATION_ACCESSIBILITY_REPORT_URL.name]: optionalUrlValidation,
});

export const accessibilityValidationSchema = z
  .object({
    [PUBLICATION_ACCESSIBILITY_STANDARD.name]: z.array(accessibilityStandardValidation).min(0).optional().default([]),
    [PUBLICATION_ACCESSIBILITY_EXCEPTION.name]: accessibilityExceptionValidation.optional().or(z.literal('')),
    [PUBLICATION_ACCESSIBILITY_REPORT_URL.name]: optionalUrlValidation,
  })
  .refine(
    (data) => {
      const hasStandards = data.accessibilityStandard && data.accessibilityStandard.length > 0;
      const hasException = !!data.accessibilityException;
      return !(hasStandards && hasException);
    },
    { message: 'Cannot have both specification and exception' },
  )
  .refine(
    (data) => {
      const standards = data.accessibilityStandard ?? [];
      const hasPrimaryStandard = standards.some((standard) => accessibilityStandards.includes(standard));
      const hasAdditionalStandard = standards.some((standard) => accessibilityAdditionalStandards.includes(standard));

      return !hasAdditionalStandard || hasPrimaryStandard;
    },
    {
      message: ERRORS.ACCESSIBILITY_PRIMARY_STANDARD_REQUIRED,
      path: [PUBLICATION_ACCESSIBILITY_STANDARD.name],
    },
  );

export const publicationFileValidationSchema = z.object({
  [PUBLICATION_FILE.name]: getFileValidation(
    appConfig.minFileSize,
    appConfig.maxPublicationFileSize,
    allSupportedPublicationFileTypes,
    ERRORS.FILE_FORMAT_INVALID,
    ERRORS.MAX_FILE_SIZE_EXCEEDED,
    ERRORS.MIN_FILE_SIZE_NOT_MET,
  ),
});
