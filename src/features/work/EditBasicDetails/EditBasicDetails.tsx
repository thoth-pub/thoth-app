'use client';

import {
  EditDoi,
  EditImprint,
  EditLicense,
  EditWorkTitle,
  EditWorkType,
  useWorkRecommendations,
} from '@/src/entities/work';
import { ANCHORS, type BaseEditSectionProps } from '@/src/shared';
import type { FormFieldOption } from '@/src/shared/interfaces';
import { RecommendedSection } from '@/src/shared/ui';

import EditWorkCover from '../EditWorkCover/EditWorkCover';

type EditWorkBasicDetailsProps = BaseEditSectionProps & {
  imprintOptions: FormFieldOption[];
  children?: Readonly<React.ReactNode>;
};

const EditBasicDetails = (props: EditWorkBasicDetailsProps) => {
  const { workId, imprintOptions, queryToken, children } = props;
  const {
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
    isBasicDetailsSectionFilled,
    isBasicDetailsSectionEmpty,
  } = useWorkRecommendations({ workId });

  return (
    <RecommendedSection
      title="Basic details"
      isEmpty={isBasicDetailsSectionEmpty}
      isValid={isBasicDetailsSectionFilled}
      id={ANCHORS.BASIC_DETAILS}
    >
      {({ showRecommendations }) => (
        <div className="grid grid-cols-[75%_25%] gap-2">
          <div>
            <EditWorkTitle workId={workId} queryToken={queryToken} />
            <EditWorkType workId={workId} queryToken={queryToken} />
            <EditImprint
              workId={workId}
              queryToken={queryToken}
              imprintOptions={imprintOptions}
              recommended={showRecommendations && isLandingPageRequired}
            />
            <EditLicense workId={workId} queryToken={queryToken} />
            <EditDoi
              workId={workId}
              queryToken={queryToken}
              recommended={showRecommendations && (isDoiRequired || isLandingPageRequired || isCoverUrlRequired)}
            />
          </div>
          <EditWorkCover workId={workId} queryToken={queryToken} />
          {children}
        </div>
      )}
    </RecommendedSection>
  );
};

export default EditBasicDetails;
