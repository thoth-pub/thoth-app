import type { SubjectType } from '@/gql/graphql';
import {
  AutocompleteField,
  CloseButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  Modal,
  ModalWrapper,
  SubmitButton,
} from '@/src/shared/ui';
import { SubjectTypes } from '@/src/shared/constants/subjects';
import { FORM_FIELDS, subjectTypeOptions } from '@/src/shared/constants/formFields';
import { bisacFormFields } from '@/src/shared/constants/bisacFormFields';
import { bicFormFields } from '@/src/shared/constants/bicFormFields';
import { themaFormFields } from '@/src/shared/constants/themaFormFields';
import { Activity, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addSubjectAutocompleteValidationSchema, addSubjectValidationSchema } from '../../../model/subject.validation';

type NewSubjectModalProps = {
  open: boolean;
  onAdd: (value: { type: SubjectType; code: string }) => void;
  onClose: () => void;
};

const { SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

const autocompleteOptions = {
  [SubjectTypes.enum.Bisac]: bisacFormFields,
  [SubjectTypes.enum.Bic]: bicFormFields,
  [SubjectTypes.enum.Thema]: themaFormFields,
  [SubjectTypes.enum.Custom]: [],
  [SubjectTypes.enum.Keyword]: [],
  [SubjectTypes.enum.Lcc]: [],
};

export const NewSubjectModal = (props: NewSubjectModalProps) => {
  const { open, onClose, onAdd } = props;

  const [optionsLength, setOptionsLength] = useState(0);
  const isAutocomplete = optionsLength > 0;

  const { control, setValue, handleSubmit, reset } = useForm({
    resolver: zodResolver(isAutocomplete ? addSubjectAutocompleteValidationSchema : addSubjectValidationSchema),
    defaultValues: {
      [SUBJECT_TYPE.name]: subjectTypeOptions[0].value as SubjectType,
      [SUBJECT_CODE.name]: '',
    },
  });
  const typeField = useWatch({ control, name: SUBJECT_TYPE.name });
  const codeField = useWatch({ control, name: SUBJECT_CODE.name });

  const options = autocompleteOptions[typeField];

  useEffect(() => {
    setOptionsLength(options.length);

    if (options.length > 0) {
      setValue(SUBJECT_CODE.name, {
        value: '',
        label: '',
      });
      return;
    }

    setValue(SUBJECT_CODE.name, '');
  }, [typeField]);

  const onSubmit = () => {
    const isString = typeof codeField === 'string';

    if (!codeField || (isString && codeField.length === 0) || (!isString && codeField?.value?.length === 0)) {
      return;
    }

    onAdd({ type: typeField, code: isString ? codeField : codeField?.value });
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalWrapper>
        <div className="ml-auto flex gap-1">
          <SubmitButton type="button" onClick={onSubmit} />
          <CloseButton onClose={handleClose} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-(--default-gap)">
          <FormFieldWrapper>
            <FormFieldLabel label={SUBJECT_TYPE.label} id={SUBJECT_TYPE.name} />
            <FormFieldWithControlsWrapper>
              <FormTextField name={SUBJECT_TYPE.name} control={control} select fullWidth options={subjectTypeOptions} />
            </FormFieldWithControlsWrapper>
          </FormFieldWrapper>

          <FormFieldWrapper>
            <FormFieldLabel label={SUBJECT_CODE.label} id={SUBJECT_CODE.name} />
            <Activity mode={options.length === 0 ? 'visible' : 'hidden'}>
              <FormTextField name={SUBJECT_CODE.name} control={control} />
            </Activity>
            <Activity mode={options.length > 0 ? 'visible' : 'hidden'}>
              <AutocompleteField name={SUBJECT_CODE.name} control={control} options={options} />
            </Activity>
          </FormFieldWrapper>
        </form>
      </ModalWrapper>
    </Modal>
  );
};
