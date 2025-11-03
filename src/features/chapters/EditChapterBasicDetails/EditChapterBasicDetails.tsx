'use client';

import { EditDoi, EditLicense, EditWorkTitle, useWorkRecommendations } from '@/src/entities/work';
import { type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditChapterBasicDetailsProps = BaseEditSectionProps & {
  isMultipleChaptersEdit?: boolean;
};

const EditChapterBasicDetails = (props: EditChapterBasicDetailsProps) => {
  const { workId, queryToken, isMultipleChaptersEdit = false } = props;

  const { isDoiRequired, isLandingPageRequired } = useWorkRecommendations({ workId });

  return (
    <RecommendedSection
      title="Basic details"
      isEmpty={false}
      isValid={!isDoiRequired && !isLandingPageRequired}
      className="bg-[var(--color-modal-content-background)]"
    >
      {({ showRecommendations }) => (
        <div>
          {!isMultipleChaptersEdit && (
            <EditWorkTitle
              workId={workId}
              queryToken={queryToken}
              recommended={showRecommendations}
              onUpdate={(data) => console.log(data)}
            />
          )}
          <EditLicense workId={workId} queryToken={queryToken} onUpdate={(data) => console.log(data)} />
          {!isMultipleChaptersEdit && (
            <EditDoi
              workId={workId}
              queryToken={queryToken}
              recommended={showRecommendations}
              onUpdate={(data) => console.log(data)}
            />
          )}
        </div>
      )}
    </RecommendedSection>
  );
};

export default EditChapterBasicDetails;
