'use client';

import { useWork } from '@/src/entities/work';
import { IDs, type BaseEditSectionProps } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { landingPageValidationSchema } from '../../model/work.validation';

const { LANDING_PAGE } = FORM_FIELDS;

const EditLandingPage = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { work, updateWork } = useWork(workId, queryToken);

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
      preview={({ onEdit }) => <Preview label={LANDING_PAGE.label} value={landingPageValue} onEdit={onEdit} />}
    />
  );
};

export default EditLandingPage;
