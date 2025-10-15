import { convertOptionToString, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS, workStatusOptions } from '@/src/shared/constants/formFields';
import { EditButton, FormFieldLabel, FormTextField, InputLabel, Typography } from '@/src/shared/ui';
import { EditableContentAlt } from '@/src/shared/ui/layout/EditableContent/EditableContentAlt';

import { WorkStatus } from '../../model/work.types';
import { workStatusValidationSchema } from '../../model/work.validation';

const { WORK_STATUS } = FORM_FIELDS;
const { WORK_STATUS: WORK_STATUS_HELPER_TEXT } = HELPER_TEXT;

type EditStatusProps = {
  defaultValue: WorkStatus;
  onUpdate?: (data: WorkStatus) => void;
};

const EditStatus = (props: EditStatusProps) => {
  const { defaultValue, onUpdate } = props;

  const value = workStatusOptions.find((option) => option.value === defaultValue) ?? workStatusOptions[0];

  return (
    <EditableContentAlt
      formId={IDs.WORK_STATUS}
      borderTransparent
      isTableVariant
      validationSchema={workStatusValidationSchema}
      defaultValues={{ [WORK_STATUS.name]: value.value }}
      onSubmit={(data) => onUpdate?.(data.workStatus as WorkStatus)}
      formFields={({ control, isHelperTextVisible }) => (
        <div className="flex flex-col gap-2">
          <FormFieldLabel label={WORK_STATUS.label} id={WORK_STATUS.name} />
          <FormTextField
            control={control}
            name={WORK_STATUS.name}
            id={WORK_STATUS.name}
            select
            fullWidth
            options={workStatusOptions}
            helperText={WORK_STATUS_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            className="h-10"
          />
        </div>
      )}
      preview={({ data, onEdit }) => (
        <div className="flex flex-col gap-2">
          <InputLabel>{WORK_STATUS.label}</InputLabel>
          <div className="group flex items-center gap-1">
            <Typography>{convertOptionToString(data?.workStatus ?? '')}</Typography>
            <EditButton onClick={onEdit} className="opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      )}
    />
  );
};

export default EditStatus;
