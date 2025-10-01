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

  const { imageCount, tableCount, audioCount, videoCount, pageCount, pageBreakdown } = work;

  const isWithoutImages = imageCount === 0;
  const isWithoutTables = tableCount === 0;
  const isWithoutAudio = audioCount === 0;
  const isWithoutVideo = videoCount === 0;
  const isWithoutPages = pageCount === 0;
  const isWithoutPageBreakdown = pageBreakdown.length === 0;

  const isMediaValid = [isWithoutImages, isWithoutTables, isWithoutAudio, isWithoutVideo].some(
    (indicator) => !indicator,
  );
  const isMediaEmpty = [isWithoutImages, isWithoutTables, isWithoutAudio, isWithoutVideo].every(
    (indicator) => indicator,
  );

  const isPagesValid = !isWithoutPages && !isWithoutPageBreakdown;
  const isPagesEmpty = isWithoutPages && isWithoutPageBreakdown;

  const isValid = isMediaValid && isPagesValid;
  const isEmpty = isMediaEmpty && isPagesEmpty;

  return (
    <RecommendedSection title="Descriptions" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          <EditPagesCount workId={workId} queryToken={queryToken} recommended={showRecommendations && !isPagesValid} />
          <EditMedia workId={workId} queryToken={queryToken} recommended={showRecommendations && !isMediaValid} />
          <EditLanguages workId={workId} queryToken={queryToken} recommended={showRecommendations} />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditDescriptions;
