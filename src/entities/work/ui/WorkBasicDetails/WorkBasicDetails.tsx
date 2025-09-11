'use client';

import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import type { FormFieldOption, QueryToken } from '@/src/shared/interfaces';
import { AccordionSection, FormsWrapper, MarkdownFormWithPreview, TextFormWithPreview } from '@/src/shared/ui';
import { isBookChapter } from '@/src/shared/utils';

import type { WorkId, WorkType } from '../../model/work.types';
import {
  copyrightHolderValidationSchema,
  coverUrlValidationSchema,
  editionValidationSchema,
  imprintValidationSchema,
  landingPageValidationSchema,
  licenseValidationSchema,
  titleValidationSchema,
  workTypeValidationSchema,
} from '../../model/work.validation';
import { useWorkBasicDetails } from './useWorkBasicDetails';

const {
  FORM_SECTIONS: { BASIC_DETAILS },
  FORM_FIELDS: {
    WORK_TITLE: WORK_TITLE_ID,
    EDITION: EDITION_ID,
    IMPRINT: IMPRINT_ID,
    WORK_TYPE: WORK_TYPE_ID,
    LICENSE: LICENSE_ID,
    COPYRIGHT_HOLDER: COPYRIGHT_HOLDER_ID,
    LANDING_PAGE: LANDING_PAGE_ID,
    COVER_URL: COVER_URL_ID,
  },
} = IDs;

const { WORK_TITLE, EDITION, IMPRINT, WORK_TYPE, LICENSE, COPYRIGHT_HOLDER, LANDING_PAGE, COVER_URL } = FORM_FIELDS;

type WorkBasicDetailsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
};

const WorkBasicDetails = (props: WorkBasicDetailsProps) => {
  const { workId, imprintOptions, workTypeOptions, licenseOptions, queryToken } = props;
  const {
    work,
    changeWorkType,
    changeEdition,
    changeImprint,
    changeLicense,
    changeCopyrightHolder,
    changeLandingPage,
    changeCoverUrl,
  } = useWorkBasicDetails({
    workId,
    queryToken,
  });
  const isChapter = isBookChapter(work?.type as WorkType);

  return (
    <AccordionSection title="Basic Details" panelId={BASIC_DETAILS} defaultExpanded>
      <FormsWrapper>
        <MarkdownFormWithPreview
          validationSchema={titleValidationSchema}
          label={WORK_TITLE.label}
          name={WORK_TITLE.name}
          id={WORK_TITLE_ID}
          defaultValue={work?.title}
        />

        {!isChapter && (
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
        )}

        <TextFormWithPreview
          validationSchema={imprintValidationSchema}
          label={IMPRINT.label}
          name={IMPRINT.name}
          id={IMPRINT_ID}
          select
          options={imprintOptions}
          defaultValue={work?.imprintId}
          onSubmit={changeImprint}
        />

        <TextFormWithPreview
          validationSchema={workTypeValidationSchema}
          label={WORK_TYPE.label}
          name={WORK_TYPE.name}
          id={WORK_TYPE_ID}
          select
          options={workTypeOptions}
          defaultValue={work?.type}
          onSubmit={changeWorkType}
        />

        <TextFormWithPreview
          validationSchema={licenseValidationSchema}
          label={LICENSE.label}
          name={LICENSE.name}
          id={LICENSE_ID}
          select
          options={licenseOptions}
          type={LICENSE.type}
          defaultValue={work?.license ?? undefined}
          onSubmit={changeLicense}
        />

        <TextFormWithPreview
          validationSchema={copyrightHolderValidationSchema}
          label={COPYRIGHT_HOLDER.label}
          name={COPYRIGHT_HOLDER.name}
          id={COPYRIGHT_HOLDER_ID}
          defaultValue={work?.copyrightHolder ?? undefined}
          onSubmit={changeCopyrightHolder}
        />

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
      </FormsWrapper>
    </AccordionSection>
  );
};

export default WorkBasicDetails;
