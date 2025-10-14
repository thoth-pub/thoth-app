'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { LOCALES } from '../../constants';
import { resources } from '../model/i18n.resources';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    // debug: true,
    supportedLngs: LOCALES.options,
    fallbackLng: LOCALES.enum.en,
    defaultNS: 'translation',
    lng: undefined,
    detection: {
      order: ['navigator'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
