import { LOCALES } from '../../constants';
import { RESOURCES } from './i18n.types';

type Resources = {
  [key in keyof typeof LOCALES.enum]: {
    translation: {
      [key in keyof typeof RESOURCES.enum]: string;
    };
  };
};

export const resources: Resources = {
  [LOCALES.enum.en]: {
    translation: {
      [RESOURCES.enum['Basic details']]: 'basic details',
    },
  },
  [LOCALES.enum.es]: {
    translation: {
      [RESOURCES.enum['Basic details']]: 'detalles básicos',
    },
  },
};
