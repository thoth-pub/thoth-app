'use client';

import { useWork } from '@/src/entities/work';
import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { landingPageValidationSchema } from '../../model/work.validation';

const { LANDING_PAGE } = FORM_FIELDS;

const EditLandingPage = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work, updateWork } = useWork(workId);

  const landingPageValue = work.landingPage ?? '';

  const updateLandingPage = (landingPage: string) => {
    updateWork({ ...work, landingPage });
  };

  return (
    <EditableContent
      formId={IDs.WORK_LANDING_PAGE}
      defaultValues={{ [LANDING_PAGE.name]: landingPageValue }}
      validationSchema={landingPageValidationSchema}
      onSubmit={({ landingPage }) => updateLandingPage(landingPage)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={LANDING_PAGE.label} id={LANDING_PAGE.name} />
          <FormTextField control={control} name={LANDING_PAGE.name} id={LANDING_PAGE.name} isUrlField />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={LANDING_PAGE.label} value={landingPageValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditLandingPage;
