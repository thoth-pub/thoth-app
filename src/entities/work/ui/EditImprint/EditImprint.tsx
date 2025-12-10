'use client';

import { useWork } from '@/src/entities/work';
import { ImprintForm } from '@/src/entities/work/model/work.types';
import { imprintValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, type FormFieldOption, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditImprintProps = {
  imprintOptions: FormFieldOption[];
} & BaseRecommendedSectionProps;

const { IMPRINT } = FORM_FIELDS;

export const EditImprint = ({ workId, imprintOptions, recommended = false }: EditImprintProps) => {
  const { work, updateWork } = useWork(workId);

  const value = work?.publisherName ?? '';
  const showIndicator = recommended && !value;

  const updateImprint = ({ imprintId }: ImprintForm) => {
    updateWork({ ...work, imprintId });
  };

  return (
    <EditableContent
      formId={IDs.WORK_IMPRINT}
      defaultValues={{ [IMPRINT.name]: work?.imprintId }}
      validationSchema={imprintValidationSchema}
      onSubmit={updateImprint}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={IMPRINT.label} id={IMPRINT.name} recommended={showIndicator} />
          <FormTextField
            control={control}
            name={IMPRINT.name}
            id={IMPRINT.name}
            select
            options={imprintOptions}
            helperText={HELPER_TEXT.IMPRINT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={IMPRINT.label} value={value} recommended={showIndicator} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditImprint;
