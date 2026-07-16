'use client';

import { useCallback, useMemo, useState } from 'react';

import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { getCommonCopyrightHolder, getCommonLicense } from './bulkEdit.utils';

type PendingLicense = {
  license: string;
  copyrightHolder: string;
};

type UseBulkLicenseStateResult = {
  // The licence value to display: the just-submitted value while a save is in flight,
  // otherwise the common value derived from the persisted chapters.
  displayLicense: string | null;
  // The copyright holder to display, following the same pending/persisted rules.
  displayCopyrightHolder: string;
  // `true` when the selected chapters disagree on licence or copyright holder, so bulk
  // editing must be blocked with a mismatch notice instead of an editable form.
  hasMismatch: boolean;
  // `true` while the bulk mutation is running.
  isSaving: boolean;
  // Number of chapters affected by the bulk update, for the saving indicator copy.
  savingCount: number;
  submit: (license: string, copyrightHolder: string) => void;
};

/**
 * Owns the draft/pending UI state for the bulk licence control (licence + copyright holder).
 *
 * Three layers are kept distinct, as the persisted list must never pretend a value is
 * saved before the server confirms:
 *  - persisted: the common licence/copyright holder derived from `chapters` (query/cache);
 *  - submitted/pending: the value the user just submitted, held locally so it stays
 *    visible while the mutation runs and until the refetched chapters catch up.
 *
 * The pending value is only cleared once the persisted chapters reflect it (or the modal
 * unmounts), which avoids the control snapping back to the stale cached value in the gap
 * between the mutation resolving and the refetch landing.
 */
export const useBulkLicenseState = (
  chapters: WorkEntity[] | null,
  onSubmit: (license: string, copyrightHolder: string) => Promise<void>,
): UseBulkLicenseStateResult => {
  const { license: commonLicense, isMixed } = useMemo(() => getCommonLicense(chapters), [chapters]);
  const { value: commonCopyrightHolder, isMixed: isCopyrightHolderMixed } = useMemo(
    () => getCommonCopyrightHolder(chapters),
    [chapters],
  );

  const [pending, setPending] = useState<PendingLicense | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drop the pending overlay once the persisted chapters have caught up with both fields,
  // so the control shows the (now identical) persisted values again. Guarded on `!isSaving`
  // so it never fires mid-flight. Adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (
    !isSaving &&
    pending &&
    commonLicense === pending.license &&
    commonCopyrightHolder === pending.copyrightHolder
  ) {
    setPending(null);
  }

  const submit = useCallback(
    (license: string, copyrightHolder: string) => {
      setPending({ license, copyrightHolder });
      setIsSaving(true);

      onSubmit(license, copyrightHolder)
        // On failure keep the pending value visible so the user still sees what they
        // attempted; the mutation layer surfaces the error notification.
        .catch(() => {})
        .finally(() => setIsSaving(false));
    },
    [onSubmit],
  );

  return {
    displayLicense: pending ? pending.license : commonLicense,
    displayCopyrightHolder: pending ? pending.copyrightHolder : commonCopyrightHolder ?? '',
    // A pending submission means editing was allowed, so the mismatch flags are suppressed.
    hasMismatch: pending ? false : isMixed || isCopyrightHolderMixed,
    isSaving,
    savingCount: chapters?.length ?? 0,
    submit,
  };
};
