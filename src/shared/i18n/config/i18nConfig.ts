'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { LOCALES } from '../../constants';
// Deutsch
import commonDe from '../locales/de/common.json';
import dashboardDe from '../locales/de/dashboard.json';
import formsDe from '../locales/de/forms.json';
import navigationDe from '../locales/de/navigation.json';
import profileDe from '../locales/de/profile.json';
import workDe from '../locales/de/work.json';
// English
import commonEn from '../locales/en/common.json';
import dashboardEn from '../locales/en/dashboard.json';
import formsEn from '../locales/en/forms.json';
import navigationEn from '../locales/en/navigation.json';
import profileEn from '../locales/en/profile.json';
import workEn from '../locales/en/work.json';
// Spanish
import commonEs from '../locales/es/common.json';
import dashboardEs from '../locales/es/dashboard.json';
import formsEs from '../locales/es/forms.json';
import navigationEs from '../locales/es/navigation.json';
import profileEs from '../locales/es/profile.json';
import workEs from '../locales/es/work.json';
// Portuguese
import commonPt from '../locales/pt/common.json';
import dashboardPt from '../locales/pt/dashboard.json';
import formsPt from '../locales/pt/forms.json';
import navigationPt from '../locales/pt/navigation.json';
import profilePt from '../locales/pt/profile.json';
import workPt from '../locales/pt/work.json';
import { NAMESPACES } from '../model/i18n.types';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      [LOCALES.enum.en]: {
        common: commonEn,
        dashboard: dashboardEn,
        navigation: navigationEn,
        work: workEn,
        profile: profileEn,
        forms: formsEn,
      },
      [LOCALES.enum.pt]: {
        common: commonPt,
        dashboard: dashboardPt,
        navigation: navigationPt,
        work: workPt,
        profile: profilePt,
        forms: formsPt,
      },
      [LOCALES.enum.es]: {
        common: commonEs,
        dashboard: dashboardEs,
        navigation: navigationEs,
        work: workEs,
        profile: profileEs,
        forms: formsEs,
      },
      [LOCALES.enum.de]: {
        common: commonDe,
        dashboard: dashboardDe,
        navigation: navigationDe,
        work: workDe,
        profile: profileDe,
        forms: formsDe,
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
