import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { type Control, type DefaultValues, type FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { useUnmount } from 'react-use';
import type { ZodType } from 'zod';

import FormControlGroup from '../../forms/FormControlGroup/FormControlGroup';

export type FormProps<T extends FieldValues> = {
  validationSchema: ZodType<unknown, FieldValues>;
  defaultValues?: DefaultValues<T>;
  children: (props: { control: Control<FieldValues> }) => Readonly<React.ReactNode>;
  onSubmit: SubmitHandler<T>;
  onAutoSubmit: (data: FieldValues) => void;
};

export const FormWrapper = <T extends FieldValues>(props: FormProps<T>) => {
  const { validationSchema, defaultValues, children, onSubmit, onAutoSubmit } = props;

  const {
    control,
    handleSubmit,
    getValues,
    formState: { isValid, isDirty, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    defaultValues,
  });

  const shouldSubmitAutomatically = isDirty && isValid && !isSubmitSuccessful;

  const handleSubmitForm = handleSubmit((data) => {
    onSubmit(data as T);
  });

  useUnmount(() => {
    if (!shouldSubmitAutomatically) return;

    const values = getValues();

    onAutoSubmit(values as T);
  });

  return (
    <motion.form
      onSubmit={handleSubmitForm}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 5, ease: 'easeIn' }}
      className="flex gap-1 rounded-xl bg-[var(--color-form-background)] p-4"
    >
      <div className="grow">{children({ control: control as Control<FieldValues> })}</div>
      <FormControlGroup isDisabled={!isValid} />
    </motion.form>
  );
};
