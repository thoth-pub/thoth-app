import { PublicationType as TPublicationType } from '@/src/entities/publication/model/publication.types';

import { PublicationType } from '../../constants';

export const isDimensionsAvailable = (publicationType: TPublicationType) => {
  return publicationType === PublicationType.enum.Hardback || publicationType === PublicationType.enum.Paperback;
};
