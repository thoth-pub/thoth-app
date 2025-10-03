'use client';

import { useState } from 'react';
import type { Control, DefaultValues, FieldValues, UseFormReset, ValidationMode } from 'react-hook-form';

import type { Id } from '@/src/shared/interfaces';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import { type FormProps, FormWrapper } from './FormWrapper';

type FormFieldsProps = {
  control: Control<FieldValues>;
  isHelperTextVisible?: boolean;
  reset: UseFormReset<FieldValues>;
};

type PreviewProps<T extends FieldValues> = Partial<{
  data: T;
  onEdit: () => void;
}>;

type EditableContentProps<T extends FieldValues> = {
  formId: Id;
  isTableVariant?: boolean;
  isDisabled?: boolean;
  onSubmit: (data: T) => void;
  formFields: ({ control, isHelperTextVisible, reset }: FormFieldsProps) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: PreviewProps<T>) => Readonly<React.ReactNode>;
  skipAutoSubmit?: boolean;
  resetOnSubmit?: boolean;
  validationMode?: keyof ValidationMode;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children' | 'onClose' | 'onInfo'>;

export const EditableContent = <T extends FieldValues>(props: Omit<EditableContentProps<T>, 'onFormSubmit'>) => {
  const {
    formId,
    defaultValues,
    validationSchema,
    isTableVariant = false,
    skipAutoSubmit = false,
    validationMode = 'onChange',
    onSubmit,
    formFields,
    preview,
  } = props;

  const { activeFormId, edit, close } = useFormStateMachine();
  const [formData, setFormData] = useState(defaultValues);
  const [showInfo, setShowInfo] = useState(false);
  const isActive = activeFormId === formId;

  const handleEdit = () => {
    if (!isActive && activeFormId) {
      close();
    }

    edit(formId);
  };

  const submit = (data: FieldValues) => {
    setFormData(data as DefaultValues<T>);

    close();

    onSubmit(data as T);
  };

  const onAutoSubmit = (data: FieldValues) => {
    setFormData(data as DefaultValues<T>);

    if (skipAutoSubmit) return;

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
          defaultValues={formData}
          validationSchema={validationSchema}
          isTableVariant={isTableVariant}
          validationMode={validationMode}
          onSubmit={submit}
          onAutoSubmit={onAutoSubmit}
          onClose={onClose}
          onInfo={handleShowInfo}
        >
          {({ control, reset }) => formFields({ control, isHelperTextVisible: showInfo, reset })}
        </FormWrapper>
      ) : (
        <div
          onDoubleClick={handleEdit}
          className={`group cursor-pointer duration-300 hover:bg-[var(--color-hover-alt)] ${isTableVariant ? '' : 'rounded-xl p-4'}`}
        >
          {preview({ data: formData as T, onEdit: handleEdit })}
        </div>
      )}
    </>
  );
};
