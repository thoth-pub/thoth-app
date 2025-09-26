'use client';

import { useWork } from '@/src/entities/work';
import { ImprintForm, type WorkId } from '@/src/entities/work/model/work.types';
import { imprintValidationSchema } from '@/src/entities/work/model/work.validation';
import { type FormFieldOption, IDs, type QueryToken } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditImprintProps = {
  imprintOptions: FormFieldOption[];
  workId: WorkId;
  queryToken: QueryToken;
};

const { IMPRINT } = FORM_FIELDS;

export const EditImprint = ({ workId, queryToken, imprintOptions }: EditImprintProps) => {
  const { work, updateWorkRef } = useWork(workId, queryToken);

  const updateImprint = ({ imprintId }: ImprintForm) => {
    updateWorkRef({ ...work, imprintId });
  };

  return (
    <EditableContent
      formId={IDs.WORK_IMPRINT}
      defaultValues={{ [IMPRINT.name]: work?.imprintId }}
      validationSchema={imprintValidationSchema}
      onSubmit={updateImprint}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={IMPRINT.label} id={IMPRINT.name} />
          <FormTextField control={control} name={IMPRINT.name} fullWidth select options={imprintOptions} />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => <Preview label={IMPRINT.label} value={work?.publisherName} onEdit={onEdit} />}
    />
  );
};

export default EditImprint;
