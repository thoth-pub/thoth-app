import { WorkStatuses } from '../..';

export const getWorkStatusFromXml = (xmlStatus: string) => {
  switch (xmlStatus) {
    case '01':
      return WorkStatuses.enum.Cancelled;
    case '02':
      return WorkStatuses.enum.Forthcoming;
    case '04':
      return WorkStatuses.enum.Active;
    default:
      return WorkStatuses.enum.Forthcoming;
  }
};
