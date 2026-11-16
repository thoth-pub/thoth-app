'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { LOCALES } from '@/src/shared/constants/locales';
import { themaFormFieldsFor } from '@/src/shared/constants/themaFormFields';
import useActiveLocale from '@/src/shared/hooks/useActiveLocale';
import type { FormFieldOption } from '@/src/shared/interfaces';
import { THEMA_CODES } from '@/src/shared/utils/subjects/thema-codes';
import {
  getLoadedThemaNames,
  loadThemaNames,
  subscribeThemaNames,
  type ThemaNames,
  themaNamesLocaleOf,
} from '@/src/shared/utils/subjects/thema-names';

const getEnglishThemaNames = (): ThemaNames => THEMA_CODES;

/**
 * The Thema subject names for the interface language (thoth-app#315). English until that language's names have
 * loaded, and always English on the server and during hydration. The first use of a language starts its load.
 */
export const useThemaNames = (): ThemaNames => {
  const locale = themaNamesLocaleOf(useActiveLocale());

  const names = useSyncExternalStore(
    subscribeThemaNames,
    () => getLoadedThemaNames(locale) ?? THEMA_CODES,
    getEnglishThemaNames,
  );

  useEffect(() => {
    if (locale !== LOCALES.enum.en) {
      void loadThemaNames(locale);
    }
  }, [locale]);

  return names;
};

/** The Thema subject options for the interface language, shared by every form. */
export const useThemaFormFields = (): FormFieldOption[] => themaFormFieldsFor(useThemaNames());
