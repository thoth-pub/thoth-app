'use client';

import { useWork } from '@/src/entities/work';
import { ImprintForm, type WorkId } from '@/src/entities/work/model/work.types';
import { imprintValidationSchema } from '@/src/entities/work/model/work.validation';
import { type FormFieldOption, HELPER_TEXT, IDs, type QueryToken } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditImprintProps = {
  imprintOptions: FormFieldOption[];
  workId: WorkId;
  queryToken: QueryToken;
  recommended?: boolean;
};

const { IMPRINT } = FORM_FIELDS;

export const EditImprint = ({ workId, queryToken, imprintOptions, recommended = false }: EditImprintProps) => {
  const { work, updateWork } = useWork(workId, queryToken);

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
            fullWidth
            select
            options={imprintOptions}
            helperText={HELPER_TEXT.IMPRINT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview label={IMPRINT.label} value={value} recommended={showIndicator} onEdit={onEdit} />
      )}
    />
  );
};

export default EditImprint;
