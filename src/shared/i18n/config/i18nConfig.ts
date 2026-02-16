'use client';

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { LOCALES } from '../../constants';
// Deutsch
import commonDe from '../locales/de/common.json';
import dashboardDe from '../locales/de/dashboard.json';
import filtersDe from '../locales/de/filters.json';
import formsDe from '../locales/de/forms.json';
import navigationDe from '../locales/de/navigation.json';
import profileDe from '../locales/de/profile.json';
import seriesDe from '../locales/de/series.json';
import setsDe from '../locales/de/sets.json';
import warningsDe from '../locales/de/warnings.json';
import worksDe from '../locales/de/works.json';
// English
import commonEn from '../locales/en/common.json';
import dashboardEn from '../locales/en/dashboard.json';
import filtersEn from '../locales/en/filters.json';
import formsEn from '../locales/en/forms.json';
import navigationEn from '../locales/en/navigation.json';
import profileEn from '../locales/en/profile.json';
import seriesEn from '../locales/en/series.json';
import setsEn from '../locales/en/sets.json';
import warningsEn from '../locales/en/warnings.json';
import worksEn from '../locales/en/works.json';
// Spanish
import commonEs from '../locales/es/common.json';
import dashboardEs from '../locales/es/dashboard.json';
import filtersEs from '../locales/es/filters.json';
import formsEs from '../locales/es/forms.json';
import navigationEs from '../locales/es/navigation.json';
import profileEs from '../locales/es/profile.json';
import seriesEs from '../locales/es/series.json';
import setsEs from '../locales/es/sets.json';
import warningsEs from '../locales/es/warnings.json';
import worksEs from '../locales/es/works.json';
// Portuguese
import commonPt from '../locales/pt/common.json';
import dashboardPt from '../locales/pt/dashboard.json';
import filtersPt from '../locales/pt/filters.json';
import formsPt from '../locales/pt/forms.json';
import navigationPt from '../locales/pt/navigation.json';
import profilePt from '../locales/pt/profile.json';
import seriesPt from '../locales/pt/series.json';
import setsPt from '../locales/pt/sets.json';
import warningsPt from '../locales/pt/warnings.json';
import worksPt from '../locales/pt/works.json';
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
        profile: profileEn,
        forms: formsEn,
        filters: filtersEn,
        sets: setsEn,
        series: seriesEn,
        works: worksEn,
        warnings: warningsEn,
      },
      [LOCALES.enum.pt]: {
        common: commonPt,
        dashboard: dashboardPt,
        navigation: navigationPt,
        profile: profilePt,
        forms: formsPt,
        filters: filtersPt,
        sets: setsPt,
        series: seriesPt,
        works: worksPt,
        warnings: warningsPt,
      },
      [LOCALES.enum.es]: {
        common: commonEs,
        dashboard: dashboardEs,
        navigation: navigationEs,
        profile: profileEs,
        forms: formsEs,
        filters: filtersEs,
        sets: setsEs,
        series: seriesEs,
        works: worksEs,
        warnings: warningsEs,
      },
      [LOCALES.enum.de]: {
        common: commonDe,
        dashboard: dashboardDe,
        navigation: navigationDe,
        profile: profileDe,
        forms: formsDe,
        filters: filtersDe,
        sets: setsDe,
        series: seriesDe,
        works: worksDe,
        warnings: warningsDe,
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
    parseMissingKeyHandler: (key, _defaultValue, options) => {
      console.warn(`Missing translation: ${key}, ${options}`);
      return key;
    },
    defaultNS: NAMESPACES.enum.common,
    ns: NAMESPACES.options,
  });

export default i18n;
