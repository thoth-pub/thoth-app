import dayjs from 'dayjs';

import { appConfig } from '../../config';

export const convertUpdatedAtToFormattedDate = (date: string) => {
  return dayjs(date).format(appConfig.tableDateFormat);
};

export const convertDateToFormattedDate = (date: string) => {
  return dayjs(date).format(appConfig.dateFormat);
};
