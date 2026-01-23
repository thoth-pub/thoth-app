'use client';

import { useState } from 'react';
import type { Control, FieldValues, UseFormReset, UseFormSetValue, ValidationMode } from 'react-hook-form';

import type { Id } from '@/src/shared/interfaces';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import { type FormProps, FormWrapper } from './FormWrapper';

type FormFieldsProps = {
  control: Control<FieldValues>;
  isHelperTextVisible?: boolean;
  reset: UseFormReset<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
};

type PreviewProps<T extends FieldValues> = Partial<{
  data: T;
  disabled?: boolean;
  onEdit: () => void;
}>;

type EditableContentAltProps<T extends FieldValues> = {
  formId: Id;
  isDisabled?: boolean;
  borderTransparent?: boolean;
  onSubmit: (data: T) => void;
  formFields: ({ control, isHelperTextVisible, reset, setValue }: FormFieldsProps) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: PreviewProps<T>) => Readonly<React.ReactNode>;
  resetOnSubmit?: boolean;
  validationMode?: keyof ValidationMode;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children' | 'onClose' | 'onInfo'>;

export const EditableContentAlt = <T extends FieldValues>(props: Omit<EditableContentAltProps<T>, 'onFormSubmit'>) => {
  const {
    formId,
    defaultValues,
    validationSchema,
    borderTransparent = false,
    isDisabled = false,
    validationMode = 'onChange',
    onSubmit,
    formFields,
    preview,
  } = props;

  const { activeFormId, edit, close } = useFormStateMachine();
  const [showInfo, setShowInfo] = useState(false);
  const isActive = activeFormId === formId;

  const handleEdit = () => {
    if (isDisabled) return;

    edit(formId);
  };

  const submit = (data: FieldValues) => {
    close();

    onSubmit(data as T);
  };

  const onClose = () => {
    if (!isActive) return;

    close();
  };

  const handleShowInfo = () => {
    setShowInfo((prev) => !prev);
  };

  return (
    <>
      {isActive ? (
        <FormWrapper
          defaultValues={defaultValues}
          validationSchema={validationSchema}
          validationMode={validationMode}
          borderTransparent={borderTransparent}
          onSubmit={submit}
          onClose={onClose}
          onInfo={handleShowInfo}
          className="items-end gap-1 bg-transparent p-0"
          controlsClassName="self-start mt-6"
        >
          {({ control, reset, setValue }) => formFields({ control, isHelperTextVisible: showInfo, reset, setValue })}
        </FormWrapper>
      ) : (
        <div onDoubleClick={handleEdit} className="cursor-pointer">
          {preview({ data: defaultValues as T, disabled: !!activeFormId && !isActive, onEdit: handleEdit })}
        </div>
      )}
    </>
  );
};
