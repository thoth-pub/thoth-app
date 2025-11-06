'use client';

import { EditSubjects } from '@/src/entities/subject';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { ANCHORS, type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

import { EditLanguages } from './components/EditLanguages';
import { EditMedia } from './components/EditMedia';
import { EditPagesCount } from './components/EditPagesCount';
import { LanguagesForm } from '@/src/entities/language/model/language.types';

type EditDescriptionsProps = BaseEditSectionProps &
  Partial<{
    isMultipleChaptersEdit: boolean;
    onLanguagesUpdate: (data: LanguagesForm) => void;
  }>;

const EditDescriptions = (props: EditDescriptionsProps) => {
  const { workId, queryToken, isMultipleChaptersEdit = false, onLanguagesUpdate } = props;

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
            />
          )}
          {!isMultipleChaptersEdit && <EditMedia workId={workId} queryToken={queryToken} />}
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
            />
          )}
        </>
      )}
    </RecommendedSection>
  );
};

export default EditDescriptions;
