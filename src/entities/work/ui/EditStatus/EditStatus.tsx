import { useMemo } from 'react';

import {
  FORM_FIELDS,
  HELPER_TEXT,
  IDs,
  WorkStatuses,
  workStatusOptions,
  workStatusOptionsAlt,
} from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { EditButton, FormFieldLabel, FormTextField, InputLabel, TranslatedContent } from '@/src/shared/ui';
import { EditableContentAlt } from '@/src/shared/ui/layout/EditableContent/EditableContentAlt';

import { WorkStatus } from '../../model/work.types';
import { workStatusValidationSchema } from '../../model/work.validation';
import WorkStatusChip from '../WorkStatusChip/WorkStatusChip';

const { WORK_STATUS } = FORM_FIELDS;
const { WORK_STATUS: WORK_STATUS_HELPER_TEXT } = HELPER_TEXT;

type EditStatusProps = {
  disabled?: boolean;
  defaultValue: WorkStatus;
  onUpdate?: (data: WorkStatus) => void;
};

const EditStatus = (props: EditStatusProps) => {
  const { disabled = true, defaultValue, onUpdate } = props;

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

  const isFieldDisable = disabled || availableNewStatusOptions.length < 1;

  return (
    <EditableContentAlt
      formId={IDs.WORK_STATUS}
      borderTransparent
      isTableVariant
      validationSchema={workStatusValidationSchema}
      onSubmit={(data) => onUpdate?.(data.workStatus as WorkStatus)}
      isDisabled={isFieldDisable}
      faq={WORK_STATUS_HELPER_TEXT}
      formFields={({ control }) => (
        <div className="flex flex-col gap-2">
          <FormFieldLabel label={WORK_STATUS.label} id={WORK_STATUS.name} namespace={NAMESPACES.enum.common} />
          <FormTextField
            control={control}
            name={WORK_STATUS.name}
            id={WORK_STATUS.name}
            select
            fullWidth
            options={availableNewStatusOptions}
            className="min-h-10"
            disabled={isFieldDisable}
            translateOptions
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
            <InputLabel>
              <TranslatedContent content={WORK_STATUS.label} />
            </InputLabel>
            <div className="group flex items-center gap-1">
              <WorkStatusChip status={defaultValue} />
              <EditButton onClick={onEdit} disabled={disabled} className="opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        );
      }}
    />
  );
};

export default EditStatus;
