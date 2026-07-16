'use client';

import { useCallback, useMemo, useState } from 'react';

import type { LanguageCode } from '@/gql/graphql';
import type { LanguageEntity, LanguagesForm } from '@/src/entities/language/model/language.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { areLanguageSetsEqual, getCommonLanguages } from './bulkEdit.utils';

type UseBulkLanguagesStateResult = {
  // The language set to display: the just-submitted set while a save is in flight,
  // otherwise the common set derived from the persisted chapters.
  displayLanguages: LanguageEntity[];
  // `true` when the selected chapters disagree on their language set, so bulk editing
  // must be blocked with a mismatch notice instead of an editable control.
  hasMismatch: boolean;
  // `true` while a bulk language mutation is running.
  isSaving: boolean;
  // Number of chapters affected by the bulk update, for the saving indicator copy.
  savingCount: number;
  submit: (data: LanguagesForm) => void;
  deleteLanguage: (id: string) => void;
};

const toLanguageEntities = (data: LanguagesForm): LanguageEntity[] =>
  data.languages.map(({ languageId, language: { value }, languageRelation }) => ({
    id: languageId,
    code: value as LanguageCode,
    relation: languageRelation,
  }));

/**
 * Owns the draft/pending UI state for the bulk language control, mirroring
 * {@link useBulkLicenseState}: the submitted language set stays visible while the
 * per-chapter mutations run and until the refetched chapters catch up, so the control
 * does not snap back to the stale cached value mid-save.
 */
export const useBulkLanguagesState = (
  chapters: WorkEntity[] | null,
  onSubmit: (data: LanguagesForm) => Promise<void>,
  onDelete: (id: string) => Promise<void>,
): UseBulkLanguagesStateResult => {
  const { languages: commonLanguages, isMixed } = useMemo(() => getCommonLanguages(chapters), [chapters]);

  const [pending, setPending] = useState<LanguageEntity[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const persistedLanguages = commonLanguages ?? [];

  // Drop the pending overlay once the persisted chapters have caught up with it. Adjusted
  // during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (!isSaving && pending && areLanguageSetsEqual(pending, persistedLanguages)) {
    setPending(null);
  }

  const runSave = useCallback((run: () => Promise<void>) => {
    setIsSaving(true);

    run()
      .catch(() => {})
      .finally(() => setIsSaving(false));
  }, []);

  const submit = useCallback(
    (data: LanguagesForm) => {
      setPending(toLanguageEntities(data));
      runSave(() => onSubmit(data));
    },
    [onSubmit, runSave],
  );

  const deleteLanguage = useCallback(
    (id: string) => {
      runSave(() => onDelete(id));
    },
    [onDelete, runSave],
  );

  return {
    displayLanguages: pending ?? persistedLanguages,
    // A pending submission means editing was allowed, so the mismatch flag is suppressed.
    hasMismatch: pending ? false : isMixed,
    isSaving,
    savingCount: chapters?.length ?? 0,
    submit,
    deleteLanguage,
  };
};
