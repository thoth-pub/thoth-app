import { useMemo } from 'react';

import { HELPER_TEXT, IDs, WorkStatuses } from '@/src/shared';
import { FORM_FIELDS, workStatusOptions, workStatusOptionsAlt } from '@/src/shared/constants/formFields';
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

  const availableNewStatusOptions = useMemo(() => {
    if (defaultValue === WorkStatuses.enum.Forthcoming) {
      return workStatusOptions.filter(
        (option) =>
          option.value === WorkStatuses.enum.PostponedIndefinitely ||
          option.value === WorkStatuses.enum.Cancelled ||
          option.value === WorkStatuses.enum.Active,
      );
    }

    if (defaultValue === WorkStatuses.enum.PostponedIndefinitely) {
      return workStatusOptions.filter((option) => option.value === WorkStatuses.enum.Forthcoming);
    }

    if (defaultValue === WorkStatuses.enum.Active) {
      return workStatusOptions.filter(
        (option) => option.value === WorkStatuses.enum.Withdrawn || option.value === WorkStatuses.enum.Superseded,
      );
    }

    return [];
  }, [defaultValue]);

  const isFieldDisable = availableNewStatusOptions.length < 1;

  return (
    <EditableContentAlt
      formId={IDs.WORK_STATUS}
      borderTransparent
      isTableVariant
      validationSchema={workStatusValidationSchema}
      onSubmit={(data) => onUpdate?.(data.workStatus as WorkStatus)}
      isDisabled={isFieldDisable}
      formFields={({ control, isHelperTextVisible }) => (
        <div className="flex flex-col gap-2">
          <FormFieldLabel label={WORK_STATUS.label} id={WORK_STATUS.name} />
          <FormTextField
            control={control}
            name={WORK_STATUS.name}
            id={WORK_STATUS.name}
            select
            fullWidth
            options={availableNewStatusOptions}
            helperText={WORK_STATUS_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            className="h-10"
            disabled={isFieldDisable}
          />
        </div>
      )}
      preview={({ disabled, onEdit }) => {
        const option = workStatusOptionsAlt.find((option) => option.value === defaultValue);

        if (!option) {
          return null;
        }

        return (
          <div className="flex flex-col gap-2">
            <InputLabel>{WORK_STATUS.label}</InputLabel>
            <div className="group flex items-center gap-1">
              <Typography>{option.label}</Typography>
              <EditButton onClick={onEdit} disabled={disabled} className="opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        );
      }}
    />
  );
};

export default EditStatus;
