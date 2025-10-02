'use client';

import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

import { EditLanguages } from './components/EditLanguages';
import { EditMedia } from './components/EditMedia';
import { EditPagesCount } from './components/EditPagesCount';

type EditDescriptionsProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const EditDescriptions = (props: EditDescriptionsProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);

  const { pageCount, frontmatterCount, backmatterCount } = work;

  const isWithoutPages = pageCount === 0;
  const isWithoutPageBreakdown = frontmatterCount === 0 && backmatterCount === 0;
  const isWithoutLanguages = work.languages.length === 0;

  const isLanguagesValid = !isWithoutLanguages;

  const isPagesValid = !isWithoutPages && !isWithoutPageBreakdown;
  const isPagesEmpty = isWithoutPages && isWithoutPageBreakdown;

  const isValid = isPagesValid && isLanguagesValid;
  const isEmpty = isPagesEmpty && isWithoutLanguages;

  return (
    <RecommendedSection title="Descriptions" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          <EditPagesCount workId={workId} queryToken={queryToken} recommended={showRecommendations && !isPagesValid} />
          <EditMedia workId={workId} queryToken={queryToken} />
          <EditLanguages workId={workId} queryToken={queryToken} recommended={showRecommendations} />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditDescriptions;
