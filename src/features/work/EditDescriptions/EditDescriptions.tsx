'use client';

import { EditSubjects } from '@/src/entities/subject';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { ANCHORS, type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

import { EditLanguages } from './components/EditLanguages';
import { EditMedia } from './components/EditMedia';
import { EditPagesCount } from './components/EditPagesCount';
import { MediaForm, PagesCountForm } from '@/src/entities/work/model/work.types';
import { LanguagesForm } from '@/src/entities/language/model/language.types';
import type { SubjectsFormType } from '@/src/entities/subject/model/subject.types';

type EditDescriptionsProps = BaseEditSectionProps &
  Partial<{
    isMultipleChaptersEdit: boolean;
    onPageCountUpdate: (data: PagesCountForm) => void;
    onMediaUpdate: (data: MediaForm) => void;
    onLanguagesUpdate: (data: LanguagesForm) => void;
    onSubjectsUpdate: (data: SubjectsFormType) => void;
  }>;

const EditDescriptions = (props: EditDescriptionsProps) => {
  const {
    workId,
    queryToken,
    isMultipleChaptersEdit = false,
    onPageCountUpdate,
    onMediaUpdate,
    onLanguagesUpdate,
    onSubjectsUpdate,
  } = props;

  const { work } = useWork(workId, queryToken);
  const { isPageCountRequired, isLanguagesRequired, isSubjectsRequired } = useWorkRecommendations({ workId });

  const isValid = !isPageCountRequired && !isLanguagesRequired && !isSubjectsRequired;
  const isEmpty = work.languages.length === 0 && work.pageCount === 0;

  return (
    <RecommendedSection title="Descriptions" isEmpty={isEmpty} isValid={isValid} id={ANCHORS.DESCRIPTIONS}>
      {({ showRecommendations }) => (
        <>
          {!isMultipleChaptersEdit && (
            <EditPagesCount
              workId={workId}
              queryToken={queryToken}
              recommended={showRecommendations && isPageCountRequired}
              onUpdate={onPageCountUpdate}
            />
          )}
          {!isMultipleChaptersEdit && <EditMedia workId={workId} queryToken={queryToken} onUpdate={onMediaUpdate} />}
          <EditLanguages
            workId={workId}
            queryToken={queryToken}
            recommended={showRecommendations && isLanguagesRequired}
            onUpdate={onLanguagesUpdate}
          />
          {!isMultipleChaptersEdit && (
            <EditSubjects
              workId={workId}
              queryToken={queryToken}
              recommended={showRecommendations && isSubjectsRequired}
              onUpdate={onSubjectsUpdate}
            />
          )}
        </>
      )}
    </RecommendedSection>
  );
};

export default EditDescriptions;
