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

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { Id } from '@/src/shared/interfaces';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { CloseButton, MarkdownRenderer, Modal, ModalWrapper } from '@/src/shared/ui';

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

type EditableContentProps<T extends FieldValues> = {
  formId: Id;
  isTableVariant?: boolean;
  isDisabled?: boolean;
  borderTransparent?: boolean;
  onSubmit: (data: T) => void | Promise<void>;
  formFields: ({ control, reset, setValue }: FormFieldsProps) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: PreviewProps<T>) => Readonly<React.ReactNode>;
  resetOnSubmit?: boolean;
  validationMode?: keyof ValidationMode;
  faq?: string;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children' | 'onClose'>;

export const EditableContent = <T extends FieldValues>(props: Omit<EditableContentProps<T>, 'onFormSubmit'>) => {
  const {
    formId,
    defaultValues,
    validationSchema,
    isTableVariant = false,
    borderTransparent = false,
    isDisabled = false,
    validationMode = 'onChange',
    faq = '',
    onSubmit,
    formFields,
    preview,
  } = props;

  const { activeFormId, edit, closeForm } = useFormStateMachine();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.forms });
  const [formData, setFormData] = useState(defaultValues);
  const [showFaq, setShowFaq] = useState(false);
  const isActive = activeFormId === formId;

  const showFaqButton = faq && faq.length > 0;

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

  const handleToggleFaq = () => setShowFaq((prev) => !prev);

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
          onInfo={handleToggleFaq}
          showFaqButton={!!showFaqButton}
        >
          {({ control, reset, setValue }) => formFields({ control, reset, setValue })}
        </FormWrapper>
      ) : (
        <div
          onDoubleClick={handleEdit}
          className={`group cursor-pointer ${borderTransparent ? '' : 'border border-transparent hover:border-(--color-hover-border)'} duration-300 hover:bg-(--color-hover-alt) ${isTableVariant ? '' : 'rounded-xl p-4'}`}
        >
          {preview({ data: formData as T, disabled: !!activeFormId && !isActive, onEdit: handleEdit })}
        </div>
      )}
      <Modal open={showFaq} onClose={handleToggleFaq}>
        <ModalWrapper>
          <CloseButton onClose={handleToggleFaq} className="self-end" />
          <MarkdownRenderer markdown={t(faq)} />
        </ModalWrapper>
      </Modal>
    </>
  );
};
