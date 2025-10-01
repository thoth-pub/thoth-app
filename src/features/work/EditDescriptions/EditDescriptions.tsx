'use client';

import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

import { EditMedia } from './components/EditMedia';

type EditDescriptionsProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const EditDescriptions = (props: EditDescriptionsProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);

  const { imageCount, tableCount, audioCount, videoCount } = work;

  const isWithoutImages = imageCount === 0;
  const isWithoutTables = tableCount === 0;
  const isWithoutAudio = audioCount === 0;
  const isWithoutVideo = videoCount === 0;

  const isValid = [isWithoutImages, isWithoutTables, isWithoutAudio, isWithoutVideo].some((indicator) => !indicator);

  const isEmpty = [isWithoutImages, isWithoutTables, isWithoutAudio, isWithoutVideo].every((indicator) => indicator);

  return (
    <RecommendedSection title="Descriptions" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <EditMedia workId={workId} queryToken={queryToken} recommended={showRecommendations} />
      )}
    </RecommendedSection>
  );
};

export default EditDescriptions;
