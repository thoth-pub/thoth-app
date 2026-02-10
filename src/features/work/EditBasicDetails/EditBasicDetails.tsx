'use client';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import { useUser } from '@/src/entities/user';
import {
  EditDoi,
  EditImprint,
  EditLccn,
  EditLicense,
  EditOclc,
  EditWorkTitle,
  EditWorkType,
  useWorkRecommendations,
} from '@/src/entities/work';
import { ANCHORS, type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

import EditWorkCover from '../EditWorkCover/EditWorkCover';

type EditWorkBasicDetailsProps = BaseEditSectionProps & {
  children?: Readonly<React.ReactNode>;
};

const EditBasicDetails = (props: EditWorkBasicDetailsProps) => {
  const { workId, children } = props;
  const {
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
    isBasicDetailsSectionFilled,
    isBasicDetailsSectionEmpty,
  } = useWorkRecommendations({ workId });
  const { userImprintsOptions } = useUser();
  const { isImprintEditable } = useActivePublisherPermissions();

  return (
    <RecommendedSection
      title="Core details"
      isEmpty={isBasicDetailsSectionEmpty}
      isValid={isBasicDetailsSectionFilled}
      id={ANCHORS.BASIC_DETAILS}
    >
      {({ showRecommendations }) => (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[75%_25%]">
          <div>
            <EditWorkTitle workId={workId} />
            <EditWorkType workId={workId} />
            <EditImprint
              workId={workId}
              imprintOptions={userImprintsOptions}
              recommended={showRecommendations && isLandingPageRequired}
              disabled={!isImprintEditable}
            />
            <EditLicense workId={workId} />
            <EditDoi
              workId={workId}
              recommended={showRecommendations && (isDoiRequired || isLandingPageRequired || isCoverUrlRequired)}
            />
            <EditLccn workId={workId} />
            <EditOclc workId={workId} />
            {children}
          </div>
          <EditWorkCover workId={workId} />
        </div>
      )}
    </RecommendedSection>
  );
};

export default EditBasicDetails;
