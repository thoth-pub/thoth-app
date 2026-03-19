'use client';

import { useState } from 'react';
import type { Control, FieldValues, UseFormReset, UseFormSetValue, ValidationMode } from 'react-hook-form';

import type { Id } from '@/src/shared/interfaces';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { CloseButton, Modal, ModalWrapper } from '@/src/shared/ui';

import { type FormProps, FormWrapper } from './FormWrapper';

type FormFieldsProps = {
  control: Control<FieldValues>;
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
  formFields: ({ control, reset, setValue }: FormFieldsProps) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: PreviewProps<T>) => Readonly<React.ReactNode>;
  resetOnSubmit?: boolean;
  validationMode?: keyof ValidationMode;
  faq?: string;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children' | 'onClose'>;

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
    faq,
  } = props;

  const { activeFormId, edit, closeForm } = useFormStateMachine();
  const [showFaq, setShowFaq] = useState(false);
  const isActive = activeFormId === formId;
  const showFaqButton = faq && faq.length > 0;

  const handleEdit = () => {
    if (isDisabled) return;

    edit(formId);
  };

  const submit = (data: FieldValues) => {
    closeForm();

    onSubmit(data as T);
  };

  const onClose = () => {
    if (!isActive) return;

    closeForm();
  };

  const handleToggleFaq = () => setShowFaq((prev) => !prev);

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
          onInfo={handleToggleFaq}
          showFaqButton={!!showFaqButton}
          className="items-end gap-1 bg-transparent p-0"
          controlsClassName="self-start mt-6"
        >
          {({ control, reset, setValue }) => formFields({ control, reset, setValue })}
        </FormWrapper>
      ) : (
        <div onDoubleClick={handleEdit} className="cursor-pointer">
          {preview({
            data: defaultValues as T,
            disabled: (!!activeFormId && !isActive) || isDisabled,
            onEdit: handleEdit,
          })}
        </div>
      )}
      {showFaqButton && (
        <Modal open={showFaq} onClose={handleToggleFaq}>
          <ModalWrapper>
            {faq}
            <CloseButton onClose={handleToggleFaq} />
          </ModalWrapper>
        </Modal>
      )}
    </>
  );
};
