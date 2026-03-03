import dayjs from 'dayjs';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  DateField,
  EditButton,
  FormFieldLabel,
  FormHelperText,
  InputLabel,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { EditableContentAlt } from '@/src/shared/ui/layout/EditableContent/EditableContentAlt';
import { convertDateToFormattedDate } from '@/src/shared/utils';

import { publicationDateValidationSchema } from '../../model/work.validation';

const { PUBLICATION_DATE: PUBLICATION_DATE_HELPER_TEXT } = HELPER_TEXT;

const { PUBLICATION_DATE } = FORM_FIELDS;

type EditPublicationDateProps = Partial<{
  disabled?: boolean;
  defaultValue: string;
  minDate: string;
  onUpdate: (data: string) => void;
}>;

const EditPublicationDate = (props: EditPublicationDateProps) => {
  const { disabled = true, defaultValue, minDate, onUpdate } = props;

  return (
    <EditableContentAlt
      formId={IDs.WORK_PUBLICATION_DATE}
      borderTransparent
      isTableVariant
      validationSchema={publicationDateValidationSchema}
      defaultValues={{ [PUBLICATION_DATE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.publicationDate ?? '')}
      isDisabled={disabled}
      formFields={({ control, isHelperTextVisible }) => (
        <>
          <div className="flex flex-col gap-2">
            <FormFieldLabel
              label={PUBLICATION_DATE.label}
              id={PUBLICATION_DATE.name}
              namespace={NAMESPACES.enum.common}
            />
            <DateField
              control={control}
              name={PUBLICATION_DATE.name}
              slotProps={{ field: { id: PUBLICATION_DATE.name } }}
              minDate={minDate ? dayjs(minDate) : undefined}
              className="h-10"
              disabled={disabled}
            />
          </div>
          {isHelperTextVisible && (
            <FormHelperText>
              <TranslatedContent content={PUBLICATION_DATE_HELPER_TEXT} namespace={NAMESPACES.enum.forms} />
            </FormHelperText>
          )}
        </>
      )}
      preview={({ data, disabled, onEdit }) => (
        <div className="flex flex-col gap-2">
          <InputLabel className="capitalize">
            <TranslatedContent content={PUBLICATION_DATE.label} />
          </InputLabel>
          <div className="group flex items-center gap-1">
            <Typography>{data?.publicationDate ? convertDateToFormattedDate(data.publicationDate) : ''}</Typography>
            <EditButton disabled={disabled} onClick={onEdit} className="ml-auto opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      )}
    />
  );
};

export default EditPublicationDate;
