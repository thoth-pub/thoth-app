import { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import { appConfig } from '../../config';
import { PublicationType } from '../../constants';

import { PublicationType as TPublicationType } from '@/src/entities/publication/model/publication.types';

export const getDefaultPublication = (data?: Partial<PublicationEntity>): PublicationEntity => {
  return {
    id: appConfig.defaultId,
    type: PublicationType.enum.Pdf,
    updatedAt: '',
    isbn: '',
    title: '',
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
