'use client';

import { LanguagesForm } from '@/src/entities/language/model/language.types';
import { EditSubjects } from '@/src/entities/subject';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { ANCHORS, type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection, TranslatedContent } from '@/src/shared/ui';

import { EditAbstracts } from './components/EditAbstracts';
import { EditLanguages } from './components/EditLanguages';
import { EditMedia } from './components/EditMedia';
import { EditNotes } from './components/EditNotes';
import { EditPagesCount } from './components/EditPagesCount';

type EditDescriptionsProps = BaseEditSectionProps &
  Partial<{
    isSingleChapterEdit: boolean;
    isMultipleChaptersEdit: boolean;
    onLanguagesUpdate: (data: LanguagesForm) => void;
    onLanguagesDelete: (id: string) => void;
  }>;

const EditDescriptions = (props: EditDescriptionsProps) => {
  const {
    workId,
    isSingleChapterEdit = false,
    isMultipleChaptersEdit = false,
    onLanguagesUpdate,
    onLanguagesDelete,
  } = props;

  const { work, loading, fetching } = useWork(workId);
  const { isPageCountRequired, isLanguagesRequired, isSubjectsRequired } = useWorkRecommendations({ workId });

  const isValid = !isPageCountRequired && !isLanguagesRequired && !isSubjectsRequired;
  const isEmpty = work.languages.length === 0 && work.pageCount === 0;

  return (
    <RecommendedSection
      title={<TranslatedContent content="descriptions" />}
      isEmpty={isEmpty}
      isValid={isValid}
      id={ANCHORS.DESCRIPTIONS}
    >
      {({ showRecommendations }) => (
        <>
          {!isMultipleChaptersEdit && <EditAbstracts workId={workId} />}
          {!isMultipleChaptersEdit && (
            <EditPagesCount
              workId={workId}
              recommended={showRecommendations && isPageCountRequired}
              isChapter={isSingleChapterEdit}
            />
          )}
          {!isMultipleChaptersEdit && !isSingleChapterEdit && <EditNotes workId={workId} />}
          {!isMultipleChaptersEdit && <EditMedia workId={workId} />}
          <EditLanguages
            workId={workId}
            recommended={showRecommendations && isLanguagesRequired}
            onUpdate={onLanguagesUpdate}
            onDelete={onLanguagesDelete}
          />
          {!isMultipleChaptersEdit && (
            <EditSubjects
              workId={workId}
              recommended={showRecommendations && isSubjectsRequired}
              loading={loading || fetching}
            />
          )}
        </>
      )}
    </RecommendedSection>
  );
};

export default EditDescriptions;
