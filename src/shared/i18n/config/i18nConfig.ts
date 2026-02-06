'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { LOCALES } from '../../constants';
import commonDe from '../locales/de/common.json';
import dashboardDe from '../locales/de/dashboard.json';
import commonEn from '../locales/en/common.json';
import dashboardEn from '../locales/en/dashboard.json';
import commonEs from '../locales/es/common.json';
import dashboardEs from '../locales/es/dashboard.json';
import commonPt from '../locales/pt/common.json';
import dashboardPt from '../locales/pt/dashboard.json';
import { NAMESPACES } from '../model/i18n.types';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      [LOCALES.enum.en]: {
        common: commonEn,
        dashboard: dashboardEn,
      },
      [LOCALES.enum.pt]: {
        common: commonPt,
        dashboard: dashboardPt,
      },
      [LOCALES.enum.es]: {
        common: commonEs,
        dashboard: dashboardEs,
      },
      [LOCALES.enum.de]: {
        common: commonDe,
        dashboard: dashboardDe,
      },
    },
    // debug: true,
    supportedLngs: LOCALES.options,
    fallbackLng: LOCALES.enum.en,
    lng: undefined,
    detection: {
      order: ['navigator'],
    },
    interpolation: {
      escapeValue: false,
    },
    saveMissing: process.env.NODE_ENV === 'development',
    parseMissingKeyHandler: (key) => {
      console.warn(`Missing translation: ${key}`);
      return key;
    },
    defaultNS: NAMESPACES.enum.common,
    ns: NAMESPACES.options,
  });

export default i18n;
