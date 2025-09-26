'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { Control, DefaultValues, FieldValues } from 'react-hook-form';

import type { Id } from '@/src/shared/interfaces';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import { type FormProps, FormWrapper } from './FormWrapper';

type EditableContentProps<T extends FieldValues> = {
  formId: Id;
  onSubmit: (data: T) => void;
  formFields: ({ control }: { control: Control<FieldValues> }) => Readonly<React.ReactNode>;
  preview: ({ data, onEdit }: { data?: T; onEdit?: () => void }) => Readonly<React.ReactNode>;
} & Omit<FormProps<T>, 'onSubmit' | 'onAutoSubmit' | 'children'>;

export const EditableContent = <T extends FieldValues>(props: Omit<EditableContentProps<T>, 'onFormSubmit'>) => {
  const { formId, defaultValues, validationSchema, onSubmit, formFields, preview } = props;

  const { activeFormId, edit, close } = useFormStateMachine();
  const [formData, setFormData] = useState(defaultValues);
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
    onSubmit(data as T);
  };

  return (
    <AnimatePresence>
      {isActive ? (
        <FormWrapper
          defaultValues={formData}
          validationSchema={validationSchema}
          onSubmit={submit}
          onAutoSubmit={onAutoSubmit}
        >
          {({ control }) => formFields({ control })}
        </FormWrapper>
      ) : (
        <motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 5, ease: 'easeIn' }}
          onDoubleClick={handleEdit}
          className="group cursor-pointer rounded-xl p-4 duration-300 hover:bg-[var(--color-hover-alt)]"
        >
          {preview({ data: formData as T, onEdit: handleEdit })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
