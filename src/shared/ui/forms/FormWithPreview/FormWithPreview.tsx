'use client';

import { AnimatePresence } from 'motion/react';
import { type ReactNode } from 'react';
import { Control, type FieldValues } from 'react-hook-form';

import type { FormFieldLabel as FormFieldLabelType } from '@/src/shared/interfaces';

import EditButton from '../EditButton/EditButton';
import FormFieldLabel from '../FormFieldLabel/FormFieldLabel';
import FormFieldWrapper from '../FormFieldWrapper/FormFieldWrapper';
import EditTab from './components/EditTab';
import PreviewTab from './components/PreviewTab';
import { useFormWithPreview, type UseFormWithPreviewProps } from './hooks/useFormWithPreview';

export type FormWithPreviewProps<T extends FieldValues> = {
  label: FormFieldLabelType;
  isDisabled?: boolean;
  id?: string;
  children: (props: { control: Control<FieldValues>; formId?: string }) => ReactNode;
  preview?: (value: string) => ReactNode;
  onSubmit?: (data: T) => void;
} & UseFormWithPreviewProps<T>;

const FormWithPreview = <T extends FieldValues>(props: FormWithPreviewProps<T>) => {
  const {
    name,
    label,
    isDisabled = false,
    id,
    validationSchema,
    defaultValues,
    options = [],
    children,
    preview,
    onSubmit,
  } = props;

  const { control, serializedValue, isValid, isInEditState, fieldValue, switchEditState, submit } = useFormWithPreview({
    validationSchema,
    name,
    defaultValues,
    options,
    onSubmit,
  });

  return (
    <FormFieldWrapper>
      <FormFieldLabel label={label} id={id} />
      <AnimatePresence initial={false} mode="wait">
        {!isInEditState && (
          <PreviewTab
            value={serializedValue}
            preview={preview && isValid ? preview(serializedValue) : null}
            onEdit={switchEditState}
          >
            <EditButton
              disabled={isDisabled}
              isEmpty={!fieldValue}
              placeholder={`Add ${label}`}
              onEdit={switchEditState}
            />
          </PreviewTab>
        )}
        {isInEditState && (
          <EditTab isDisabled={isDisabled} onSubmit={submit} formId={id}>
            {children({ control: control as Control<FieldValues> })}
          </EditTab>
        )}
      </AnimatePresence>
    </FormFieldWrapper>
  );
};

export default FormWithPreview;
