'use client';

import { useWorkRecommendations } from '@/src/entities/work';
import type { BaseEditSectionProps } from '@/src/shared';
import type { FormFieldOption } from '@/src/shared/interfaces';
import { RecommendedSection } from '@/src/shared/ui';

import EditWorkTitlesFormWithPreview from '../../../entities/work/ui/EditWorkTitlesForm/EditWorkTitlesFormWithPreview';
import EditDoi from './components/EditDoi';
import EditImprint from './components/EditImprint';
import EditLicense from './components/EditLicense';
import EditWorkType from './components/EditWorkType';

type EditWorkBasicDetailsProps = BaseEditSectionProps & {
  imprintOptions: FormFieldOption[];
};

// TODO: series form
const EditBasicDetails = (props: EditWorkBasicDetailsProps) => {
  const { workId, imprintOptions, queryToken } = props;
  const { isDoiRequired, isLandingPageRequired } = useWorkRecommendations({ workId });
  // const isChapter = isBookChapter(work?.type as WorkType);

  return (
    <RecommendedSection title="Basic details" isEmpty={false} isValid={!isDoiRequired && !isLandingPageRequired}>
      {({ showRecommendations }) => (
        <>
          <EditWorkTitlesFormWithPreview />
          {/* {!isChapter && (
            <TextFormWithPreview
              validationSchema={editionValidationSchema}
              label={EDITION.label}
              name={EDITION.name}
              id={EDITION_ID}
              type={EDITION.type}
              defaultValue={work?.edition ?? undefined}
              min={1}
              onSubmit={changeEdition}
            />
          )} */}
          <EditWorkType workId={workId} queryToken={queryToken} />
          <EditImprint
            workId={workId}
            queryToken={queryToken}
            imprintOptions={imprintOptions}
            recommended={showRecommendations}
          />
          <EditLicense workId={workId} queryToken={queryToken} />
          <EditDoi workId={workId} queryToken={queryToken} recommended={showRecommendations} />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditBasicDetails;
