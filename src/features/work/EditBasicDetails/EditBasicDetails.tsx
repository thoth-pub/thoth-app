'use client';

import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import type { FormFieldOption, QueryToken } from '@/src/shared/interfaces';
import { RecommendedSection, TextFormWithPreview } from '@/src/shared/ui';
import { isBookChapter } from '@/src/shared/utils';

import type { WorkId, WorkType } from '../../../entities/work/model/work.types';
import { coverUrlValidationSchema, landingPageValidationSchema } from '../../../entities/work/model/work.validation';
import EditWorkTitlesFormWithPreview from '../../../entities/work/ui/EditWorkTitlesForm/EditWorkTitlesFormWithPreview';
import EditImprint from './components/EditImprint';
import EditLicense from './components/EditLicense';
import EditWorkType from './components/EditWorkType';
import { useEditBasicDetails } from './useEditBasicDetails';

const {
  FORM_FIELDS: { LANDING_PAGE: LANDING_PAGE_ID, COVER_URL: COVER_URL_ID },
} = IDs;

const { LANDING_PAGE, COVER_URL } = FORM_FIELDS;

type EditWorkBasicDetailsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  imprintOptions: FormFieldOption[];
};

const EditBasicDetails = (props: EditWorkBasicDetailsProps) => {
  const { workId, imprintOptions, queryToken } = props;
  const { work, changeEdition, changeLandingPage, changeCoverUrl } = useEditBasicDetails({
    workId,
    queryToken,
  });
  const isChapter = isBookChapter(work?.type as WorkType);

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
          <EditWorkType workId={workId} queryToken={queryToken} isRecommended={showRecommendations} />
          <EditImprint
            workId={workId}
            queryToken={queryToken}
            imprintOptions={imprintOptions}
            isRecommended={showRecommendations}
          />
          <EditLicense workId={workId} queryToken={queryToken} isRecommended={showRecommendations} />

          <TextFormWithPreview
            validationSchema={landingPageValidationSchema}
            label={LANDING_PAGE.label}
            name={LANDING_PAGE.name}
            id={LANDING_PAGE_ID}
            type={LANDING_PAGE.type}
            defaultValue={work?.landingPage ?? undefined}
            onSubmit={changeLandingPage}
          />

          <TextFormWithPreview
            validationSchema={coverUrlValidationSchema}
            label={COVER_URL.label}
            name={COVER_URL.name}
            id={COVER_URL_ID}
            type={COVER_URL.type}
            defaultValue={work?.coverUrl ?? undefined}
            onSubmit={changeCoverUrl}
          />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditBasicDetails;
