'use client';

import { AnimatePresence } from 'motion/react';
import { type ReactNode } from 'react';
import { Control, type FieldValues } from 'react-hook-form';

import type { FormFieldLabel } from '@/src/shared/interfaces';
import { InputLabel } from '@/src/shared/ui';

import EditButton from './components/EditButton';
import EditTab from './components/EditTab';
import PreviewTab from './components/PreviewTab';
import { useFormWithPreview, type UseFormWithPreviewProps } from './hooks/useFormWithPreview';

export type FormWithPreviewProps<T extends FieldValues> = {
  label: FormFieldLabel;
  children: (props: { control: Control<FieldValues> }) => ReactNode;
  preview?: (value: string, isValueHighlighted: boolean) => ReactNode;
  isDisabled?: boolean;
  id?: string;
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
  } = props;

  const { control, serializedValue, isValid, isInEditState, fieldValue, switchEditState } = useFormWithPreview({
    validationSchema,
    name,
    defaultValues,
    options,
  });

  return (
    <div className="grid min-h-[2.75rem] w-full grid-cols-[11.25rem_1fr] items-start">
      <InputLabel
        htmlFor={id}
        sx={{ color: isValid ? 'var(--color-form-field-label-alt)' : 'var(--color-form-field-label)' }}
      >
        {label}
      </InputLabel>
      <AnimatePresence initial={false} mode="wait">
        {!isInEditState && (
          <PreviewTab
            value={serializedValue}
            preview={preview && isValid ? preview(serializedValue, isValid) : null}
            isValueHighlighted={isValid}
            onEdit={switchEditState}
          >
            <EditButton
              isEmpty={!fieldValue}
              isValueHighlighted={isValid}
              placeholder={`Add ${label}`}
              onEdit={switchEditState}
            />
          </PreviewTab>
        )}
        {isInEditState && (
          <EditTab isDisabled={isDisabled} onClose={switchEditState}>
            {children({ control: control as Control<FieldValues> })}
          </EditTab>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormWithPreview;
