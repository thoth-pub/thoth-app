'use client';

import { LanguagesForm } from '@/src/entities/language';
import type { LanguagesForm as LanguagesFormType } from '@/src/entities/language/model/language.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { ANCHORS } from '@/src/shared/constants';
import { TranslatedContent, Typography } from '@/src/shared/ui';
import RecommendedSection from '@/src/shared/ui/layout/RecommendedSection/RecommendedSection';

import { useBulkLanguagesState } from '../model/useBulkLanguagesState';
import BulkMismatchNotice from './BulkMismatchNotice';

type BulkEditLanguagesProps = {
  chapters: WorkEntity[] | null;
  onSubmit: (data: LanguagesFormType) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

/**
 * Bulk language control for the multiple-chapters edit modal.
 *
 * Wraps the shared `LanguagesForm` but derives its value from the selected chapters.
 * Following the contributors/fundings rule, editing is only offered when every selected
 * chapter shares the same language set (or all are empty); otherwise a mismatch notice is
 * shown. When editing is allowed, the just-submitted set stays visible with a saving
 * indicator while the per-chapter mutations run.
 */
const BulkEditLanguages = (props: BulkEditLanguagesProps) => {
  const { chapters, onSubmit, onDelete } = props;

  const { displayLanguages, hasMismatch, isSaving, savingCount, submit, deleteLanguage } = useBulkLanguagesState(
    chapters,
    onSubmit,
    onDelete,
  );

  return (
    <RecommendedSection
      title={<TranslatedContent content="descriptions" />}
      isEmpty={false}
      isValid
      id={ANCHORS.DESCRIPTIONS}
    >
      {() =>
        hasMismatch ? (
          <BulkMismatchNotice content="chaptersLanguagesMismatch" />
        ) : (
          <div className={isSaving ? 'pointer-events-none opacity-60' : ''} aria-busy={isSaving}>
            <LanguagesForm languages={displayLanguages} onUpdate={submit} onDelete={deleteLanguage} />
            {isSaving && (
              <Typography role="status" className="text-sm opacity-70">
                {`Saving language for ${savingCount} chapters…`}
              </Typography>
            )}
          </div>
        )
      }
    </RecommendedSection>
  );
};

export default BulkEditLanguages;
