import dayjs from 'dayjs';

import { convertDateToFormattedDate, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
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

import { publicationDateValidationSchema } from '../../model/work.validation';

const { WITHDRAWN_DATE } = FORM_FIELDS;

const { WITHDRAWN_DATE: WITHDRAWN_DATE_HELPER_TEXT } = HELPER_TEXT;

type EditWithdrawDateProps = Partial<{
  disabled?: boolean;
  defaultValue: string;
  minDate: string;
  onUpdate: (data: string) => void;
}>;

const EditWithdrawDate = (props: EditWithdrawDateProps) => {
  const { disabled = true, defaultValue, minDate, onUpdate } = props;

  return (
    <EditableContentAlt
      formId={IDs.WORK_WITHDRAWN_DATE}
      borderTransparent
      isTableVariant
      validationSchema={publicationDateValidationSchema}
      defaultValues={{ [WITHDRAWN_DATE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.withdrawnDate ?? '')}
      isDisabled={disabled}
      formFields={({ control, isHelperTextVisible }) => (
        <div className="flex flex-col gap-2">
          <FormFieldLabel label={WITHDRAWN_DATE.label} id={WITHDRAWN_DATE.name} />
          <DateField
            control={control}
            name={WITHDRAWN_DATE.name}
            slotProps={{ field: { id: WITHDRAWN_DATE.name } }}
            minDate={minDate ? dayjs(minDate) : undefined}
            className="h-10"
            disabled={disabled}
          />
          {isHelperTextVisible && <FormHelperText>{WITHDRAWN_DATE_HELPER_TEXT}</FormHelperText>}
        </div>
      )}
      preview={({ data, disabled, onEdit }) => (
        <div className="flex flex-col gap-2">
          <InputLabel>
            <TranslatedContent content={WITHDRAWN_DATE.label} namespace={NAMESPACES.enum.forms} />
          </InputLabel>
          <div className="group flex items-center gap-1">
            <Typography>{data?.withdrawnDate ? convertDateToFormattedDate(data.withdrawnDate) : ''}</Typography>
            <EditButton disabled={disabled} onClick={onEdit} className="ml-auto opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      )}
    />
  );
};

export default EditWithdrawDate;
