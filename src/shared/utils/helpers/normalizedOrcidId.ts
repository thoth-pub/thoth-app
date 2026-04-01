import { appConfig } from '../../config';

export const normalizedOrcidId = (orcidId: string) => {
  if (orcidId.length === 0) return null;

  return !orcidId.startsWith(appConfig.validations.orcidPrefix) ? appConfig.validations.orcidPrefix + orcidId : orcidId;
};
