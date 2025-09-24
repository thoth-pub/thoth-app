import { appConfig } from '../../config';

export const isDefaultId = (id: string) => id === appConfig.defaultId;
