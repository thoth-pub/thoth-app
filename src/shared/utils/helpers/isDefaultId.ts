import { config } from '../../config';

export const isDefaultId = (id: string) => id === config.defaultId;
