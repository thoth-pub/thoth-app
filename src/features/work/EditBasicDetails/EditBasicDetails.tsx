'use client';

import { useWorkRecommendations } from '@/src/entities/work';
import type { BaseEditSectionProps } from '@/src/shared';
import type { FormFieldOption } from '@/src/shared/interfaces';
import { RecommendedSection } from '@/src/shared/ui';

import EditWorkTitlesFormWithPreview from '../../../entities/work/ui/EditWorkTitlesForm/EditWorkTitlesFormWithPreview';
import EditWorkCover from '../EditWorkCover/EditWorkCover';
import EditDoi from './components/EditDoi';
import EditImprint from './components/EditImprint';
import EditLicense from './components/EditLicense';
import EditWorkType from './components/EditWorkType';

type EditWorkBasicDetailsProps = BaseEditSectionProps & {
  imprintOptions: FormFieldOption[];
};

const EditBasicDetails = (props: EditWorkBasicDetailsProps) => {
  const { workId, imprintOptions, queryToken } = props;
  const { isDoiRequired, isLandingPageRequired } = useWorkRecommendations({ workId });

  return (
    <RecommendedSection title="Basic details" isEmpty={false} isValid={!isDoiRequired && !isLandingPageRequired}>
      {({ showRecommendations }) => (
        <div className="grid grid-cols-[1fr_200px] gap-2 lg:grid-cols-[1fr_300px]">
          <div>
            <EditWorkTitlesFormWithPreview />
            <EditWorkType workId={workId} queryToken={queryToken} />
            <EditImprint
              workId={workId}
              queryToken={queryToken}
              imprintOptions={imprintOptions}
              recommended={showRecommendations}
            />
            <EditLicense workId={workId} queryToken={queryToken} />
            <EditDoi workId={workId} queryToken={queryToken} recommended={showRecommendations} />
          </div>
          <EditWorkCover />
        </div>
      )}
    </RecommendedSection>
  );
};

export default EditBasicDetails;
