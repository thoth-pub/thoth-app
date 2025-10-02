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

  const { pageCount, pageBreakdown } = work;

  const isWithoutPages = pageCount === 0;
  const isWithoutPageBreakdown = pageBreakdown.length === 0;

  const isPagesValid = !isWithoutPages && !isWithoutPageBreakdown;
  const isPagesEmpty = isWithoutPages && isWithoutPageBreakdown;

  const isValid = isPagesValid;
  const isEmpty = isPagesEmpty;

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
