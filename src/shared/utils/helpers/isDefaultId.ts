import { appConfig } from '../../config';

export const isDefaultId = (id: string) =>
  id === appConfig.defaultId || id.startsWith(appConfig.defaultId) || id.endsWith(appConfig.defaultId);
