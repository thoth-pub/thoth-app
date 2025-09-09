'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { Control, type FieldValues, type Path, useForm } from 'react-hook-form';
import { ZodType } from 'zod';

import type { BaseFieldProps, FormFieldLabel } from '@/src/shared/interfaces';
import { InputLabel } from '@/src/shared/ui';

import EditButton from './components/EditButton';
import EditTab from './components/EditTab';
import PreviewTab from './components/PreviewTab';

type FormWithPreviewProps<T extends FieldValues> = {
  label: FormFieldLabel;
  children: (props: { control: Control<FieldValues> }) => ReactNode;
  validationSchema: ZodType<unknown, FieldValues>;
  preview?: (value: string, isValueHighlighted: boolean) => ReactNode;
  isDisabled?: boolean;
  id?: string;
  defaultValues?: FieldValues;
} & Omit<BaseFieldProps<T>, 'control'>;

const FormWithPreview = <T extends FieldValues>(props: FormWithPreviewProps<T>) => {
  const { name, label, isDisabled = false, id, validationSchema, defaultValues, children, preview } = props;

  const {
    control,
    getValues,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    defaultValues,
  });
  const [isInEditState, setIsInEditState] = useState(false);

  const switchEditState = () => {
    setIsInEditState(!isInEditState);
  };

  const formFieldValue = getValues(name as Path<T>) ?? '';
  const isValueFilledAndValid = !!formFieldValue && isValid;
  const serializedValue = typeof formFieldValue === 'string' ? formFieldValue : JSON.stringify(formFieldValue);

  return (
    <div className="grid min-h-[2.75rem] w-full grid-cols-[11.25rem_1fr] items-start">
      <InputLabel
        htmlFor={id}
        sx={{ color: isValueFilledAndValid ? 'var(--color-form-field-label-alt)' : 'var(--color-form-field-label)' }}
      >
        {label}
      </InputLabel>
      <AnimatePresence initial={false} mode="wait">
        {!isInEditState && (
          <PreviewTab
            value={serializedValue}
            preview={preview ? preview(serializedValue, isValueFilledAndValid) : null}
            isValueHighlighted={isValueFilledAndValid}
            onEdit={switchEditState}
          >
            <EditButton
              isEmpty={!formFieldValue}
              isValueHighlighted={isValueFilledAndValid}
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
