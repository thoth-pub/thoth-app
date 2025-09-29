'use client';

import type { FormFieldOption, QueryToken } from '@/src/shared/interfaces';
import { RecommendedSection } from '@/src/shared/ui';

import type { WorkId } from '../../../entities/work/model/work.types';
import EditWorkTitlesFormWithPreview from '../../../entities/work/ui/EditWorkTitlesForm/EditWorkTitlesFormWithPreview';
import EditDoi from './components/EditDoi';
import EditImprint from './components/EditImprint';
import EditLicense from './components/EditLicense';
import EditWorkType from './components/EditWorkType';

type EditWorkBasicDetailsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  imprintOptions: FormFieldOption[];
};

const EditBasicDetails = (props: EditWorkBasicDetailsProps) => {
  const { workId, imprintOptions, queryToken } = props;
  // const isChapter = isBookChapter(work?.type as WorkType);

  return (
    <RecommendedSection title="Basic details" isEmpty={false}>
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
          <EditWorkType workId={workId} queryToken={queryToken} recommended={showRecommendations} />
          <EditImprint
            workId={workId}
            queryToken={queryToken}
            imprintOptions={imprintOptions}
            recommended={showRecommendations}
          />
          <EditLicense workId={workId} queryToken={queryToken} recommended={showRecommendations} />
          <EditDoi workId={workId} queryToken={queryToken} recommended={showRecommendations} />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditBasicDetails;
