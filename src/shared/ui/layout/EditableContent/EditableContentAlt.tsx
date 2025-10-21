'use client';

import { useState } from 'react';
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
  onEdit: () => void;
}>;

type EditableContentAltProps<T extends FieldValues> = {
  formId: Id;
  isDisabled?: boolean;
  borderTransparent?: boolean;
  onSubmit: (data: T) => void;
  formFields: ({ control, isHelperTextVisible, reset, setValue }: FormFieldsProps) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: PreviewProps<T>) => Readonly<React.ReactNode>;
  skipAutoSubmit?: boolean;
  resetOnSubmit?: boolean;
  validationMode?: keyof ValidationMode;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children' | 'onClose' | 'onInfo'>;

export const EditableContentAlt = <T extends FieldValues>(props: Omit<EditableContentAltProps<T>, 'onFormSubmit'>) => {
  const {
    formId,
    defaultValues,
    validationSchema,
    borderTransparent = false,
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
          validationMode={validationMode}
          borderTransparent={borderTransparent}
          onSubmit={submit}
          onAutoSubmit={onAutoSubmit}
          onClose={onClose}
          onInfo={handleShowInfo}
          className="items-end gap-1 bg-transparent p-0"
          controlsClassName={showInfo ? 'my-auto' : 'mb-2.5 lg:mb-1'}
        >
          {({ control, reset, setValue }) => formFields({ control, isHelperTextVisible: showInfo, reset, setValue })}
        </FormWrapper>
      ) : (
        <div onDoubleClick={handleEdit} className="cursor-pointer">
          {preview({ data: formData as T, onEdit: handleEdit })}
        </div>
      )}
    </>
  );
};
