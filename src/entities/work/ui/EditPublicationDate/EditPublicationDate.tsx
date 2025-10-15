import dayjs from 'dayjs';

import { convertDateToFormattedDate, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { DateField, EditButton, FormFieldLabel, FormHelperText, InputLabel, Typography } from '@/src/shared/ui';
import { EditableContentAlt } from '@/src/shared/ui/layout/EditableContent/EditableContentAlt';

import { publicationDateValidationSchema } from '../../model/work.validation';

const { PUBLICATION_DATE: PUBLICATION_DATE_HELPER_TEXT } = HELPER_TEXT;

const { PUBLICATION_DATE } = FORM_FIELDS;

type EditPublicationDateProps = Partial<{
  defaultValue: string;
  minDate: string;
  onUpdate: (data: string) => void;
}>;

const EditPublicationDate = (props: EditPublicationDateProps) => {
  const { defaultValue, minDate, onUpdate } = props;

  return (
    <EditableContentAlt
      formId={IDs.WORK_PUBLICATION_DATE}
      borderTransparent
      isTableVariant
      validationSchema={publicationDateValidationSchema}
      defaultValues={{ [PUBLICATION_DATE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.publicationDate ?? '')}
      formFields={({ control, isHelperTextVisible }) => (
        <div className="flex flex-col gap-2">
          <FormFieldLabel label={PUBLICATION_DATE.label} id={PUBLICATION_DATE.name} />
          <DateField
            control={control}
            name={PUBLICATION_DATE.name}
            slotProps={{ field: { id: PUBLICATION_DATE.name } }}
            minDate={minDate ? dayjs(minDate) : undefined}
            className="h-10"
          />
          {isHelperTextVisible && <FormHelperText>{PUBLICATION_DATE_HELPER_TEXT}</FormHelperText>}
        </div>
      )}
      preview={({ data, onEdit }) => (
        <div className="flex flex-col gap-2">
          <InputLabel>{PUBLICATION_DATE.label}</InputLabel>
          <div className="group flex items-center gap-1">
            <Typography>{data?.publicationDate ? convertDateToFormattedDate(data.publicationDate) : ''}</Typography>
            <EditButton onClick={onEdit} className="opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      )}
    />
  );
};

export default EditPublicationDate;
