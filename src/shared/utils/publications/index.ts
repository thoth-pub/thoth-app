import { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import { PublicationType as TPublicationType } from '@/src/entities/publication/model/publication.types';

import { appConfig } from '../../config';
import { PublicationType } from '../../constants';

export const getDefaultPublication = (data?: Partial<PublicationEntity>): PublicationEntity => {
  return {
    id: appConfig.defaultId,
    type: PublicationType.enum.Pdf,
    updatedAt: '',
    isbn: '',
    titles: [],
    doi: '',
    publisherName: '',
    width: 0,
    widthIn: 0,
    height: 0,
    heightIn: 0,
    depth: 0,
    depthIn: 0,
    weight: 0,
    weightOz: 0,
    accessibilityReportUrl: '',
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityStandard: null,
    prices: [],
    locations: [],
    ...data,
  };
};

export const isDimensionsAvailable = (publicationType: TPublicationType) => {
  return publicationType === PublicationType.enum.Hardback || publicationType === PublicationType.enum.Paperback;
};

export const isValidPublicationForm = (publicationForm: string) => {
  const validPublicationForms = ['AJ', 'BB', 'BC', 'ED'];

  return validPublicationForms.includes(publicationForm);
};

export const getPublicationType = (publicationForm: string) => {
  switch (publicationForm) {
    case 'AJ':
      return PublicationType.enum.Mp3;
    case 'BB':
      return PublicationType.enum.Hardback;
    case 'BC':
      return PublicationType.enum.Paperback;
    case 'ED':
      return PublicationType.enum.Pdf;
    default:
      return PublicationType.enum.Pdf;
  }
};

export const isAccessibilityStandardAvailable = (publicationType: TPublicationType): boolean => {
  const ebookTypes = [
    PublicationType.enum.Azw3,
    PublicationType.enum.Docx,
    PublicationType.enum.Epub,
    PublicationType.enum.FictionBook,
    PublicationType.enum.Html,
    PublicationType.enum.Mobi,
    PublicationType.enum.Pdf,
    PublicationType.enum.Xml,
  ];

  return ebookTypes.includes(publicationType);
};

export const isAdditionalAccessibilityStandardAvailable = (publicationType: TPublicationType): boolean => {
  return publicationType === PublicationType.enum.Pdf || publicationType === PublicationType.enum.Epub;
};
