'use client';

import { useEffect, useState } from 'react';
import type {
  Control,
  DefaultValues,
  FieldValues,
  UseFormReset,
  UseFormSetValue,
  ValidationMode,
} from 'react-hook-form';

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

type EditableContentProps<T extends FieldValues> = {
  formId: Id;
  isTableVariant?: boolean;
  isDisabled?: boolean;
  borderTransparent?: boolean;
  onSubmit: (data: T) => void | Promise<void>;
  formFields: ({ control, isHelperTextVisible, reset, setValue }: FormFieldsProps) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: PreviewProps<T>) => Readonly<React.ReactNode>;
  resetOnSubmit?: boolean;
  validationMode?: keyof ValidationMode;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children' | 'onClose' | 'onInfo'>;

export const EditableContent = <T extends FieldValues>(props: Omit<EditableContentProps<T>, 'onFormSubmit'>) => {
  const {
    formId,
    defaultValues,
    validationSchema,
    isTableVariant = false,
    borderTransparent = false,
    isDisabled = false,
    validationMode = 'onChange',
    onSubmit,
    formFields,
    preview,
  } = props;

  const { activeFormId, edit, closeForm } = useFormStateMachine();
  const [formData, setFormData] = useState(defaultValues);
  const [showInfo, setShowInfo] = useState(false);
  const isActive = activeFormId === formId;

  useEffect(() => {
    setFormData(defaultValues);
  }, [defaultValues]);

  const handleEdit = () => {
    if (isDisabled) return;

    edit(formId);
  };

  const submit = async (data: FieldValues) => {
    setFormData(data as DefaultValues<T>);

    await onSubmit(data as T);

    closeForm();
  };

  const onClose = () => {
    if (!isActive) return;

    closeForm();
  };

  const handleShowInfo = () => {
    setShowInfo((prev) => !prev);
  };

  return (
    <>
      {isActive ? (
        <FormWrapper
          defaultValues={formData}
          validationSchema={validationSchema}
          isTableVariant={isTableVariant}
          validationMode={validationMode}
          borderTransparent={borderTransparent}
          onSubmit={submit}
          onClose={onClose}
          onInfo={handleShowInfo}
        >
          {({ control, reset, setValue }) => formFields({ control, isHelperTextVisible: showInfo, reset, setValue })}
        </FormWrapper>
      ) : (
        <div
          onDoubleClick={handleEdit}
          className={`group cursor-pointer ${borderTransparent ? '' : 'border border-transparent hover:border-(--color-hover-border)'} duration-300 hover:bg-(--color-hover-alt) ${isTableVariant ? '' : 'rounded-xl p-4'}`}
        >
          {preview({ data: formData as T, disabled: !!activeFormId && !isActive, onEdit: handleEdit })}
        </div>
      )}
    </>
  );
};
