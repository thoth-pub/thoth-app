import { appConfig } from '../../config';

export const getPagesCount = (totalItemsCount = 0) => {
  return Math.ceil(totalItemsCount / appConfig.data.itemsPerRequestLimit);
};
