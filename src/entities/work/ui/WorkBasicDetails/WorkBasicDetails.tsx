'use client';

import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import type { FormFieldOption, QueryToken } from '@/src/shared/interfaces';
import { AccordionSection, FormsWrapper, MarkdownFormWithPreview, TextFormWithPreview } from '@/src/shared/ui';

import type { WorkEntity } from '../../model/work.types';
import {
  copyrightHolderValidationSchema,
  editionValidationSchema,
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
  },
} = IDs;

const { WORK_TITLE, EDITION, IMPRINT, WORK_TYPE, LICENSE, COPYRIGHT_HOLDER, LANDING_PAGE } = FORM_FIELDS;

type WorkBasicDetailsProps = {
  queryToken: QueryToken;
  work: WorkEntity;
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
};

const WorkBasicDetails = ({ work, imprintOptions, workTypeOptions, queryToken }: WorkBasicDetailsProps) => {
  const { type, title } = work;
  const { submitWorkType } = useWorkBasicDetails({ work, queryToken });
  const submitPlaceholder = (data: unknown) => {
    console.log(data);
  };

  return (
    <AccordionSection title="Basic Details" panelId={BASIC_DETAILS} defaultExpanded>
      <FormsWrapper>
        <MarkdownFormWithPreview
          validationSchema={titleValidationSchema}
          label={WORK_TITLE.label}
          name={WORK_TITLE.name}
          id={WORK_TITLE_ID}
          defaultValue={title}
          onSubmit={submitPlaceholder}
        />

        <TextFormWithPreview
          validationSchema={editionValidationSchema}
          label={EDITION.label}
          name={EDITION.name}
          id={EDITION_ID}
          type={EDITION.type}
          min={1}
          onSubmit={submitPlaceholder}
        />

        <TextFormWithPreview
          validationSchema={editionValidationSchema}
          label={IMPRINT.label}
          name={IMPRINT.name}
          id={IMPRINT_ID}
          select
          options={imprintOptions}
          onSubmit={submitPlaceholder}
        />

        <TextFormWithPreview
          validationSchema={workTypeValidationSchema}
          label={WORK_TYPE.label}
          name={WORK_TYPE.name}
          id={WORK_TYPE_ID}
          select
          options={workTypeOptions}
          defaultValue={type}
          onSubmit={submitWorkType}
        />

        <TextFormWithPreview
          validationSchema={licenseValidationSchema}
          label={LICENSE.label}
          name={LICENSE.name}
          id={LICENSE_ID}
          type={LICENSE.type}
          onSubmit={submitPlaceholder}
        />

        <TextFormWithPreview
          validationSchema={copyrightHolderValidationSchema}
          label={COPYRIGHT_HOLDER.label}
          name={COPYRIGHT_HOLDER.name}
          id={COPYRIGHT_HOLDER_ID}
          onSubmit={submitPlaceholder}
        />

        <TextFormWithPreview
          validationSchema={landingPageValidationSchema}
          label={LANDING_PAGE.label}
          name={LANDING_PAGE.name}
          id={LANDING_PAGE_ID}
          type={LANDING_PAGE.type}
          onSubmit={submitPlaceholder}
        />
      </FormsWrapper>
    </AccordionSection>
  );
};

export default WorkBasicDetails;
