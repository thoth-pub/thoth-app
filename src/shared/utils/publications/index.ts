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
