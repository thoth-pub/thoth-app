import { zodResolver } from '@hookform/resolvers/zod';
import { type Control, type DefaultValues, type FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { useUnmount } from 'react-use';
import type { ZodType } from 'zod';

import FormControlGroup from '../../forms/FormControlGroup/FormControlGroup';

export type FormProps<T extends FieldValues> = {
  validationSchema: ZodType<unknown, FieldValues>;
  defaultValues?: DefaultValues<T>;
  isTableVariant?: boolean;
  children: (props: { control: Control<FieldValues> }) => Readonly<React.ReactNode>;
  onSubmit: SubmitHandler<T>;
  onAutoSubmit: (data: FieldValues) => void;
  onClose: () => void;
  onInfo: () => void;
};

export const FormWrapper = <T extends FieldValues>(props: FormProps<T>) => {
  const {
    validationSchema,
    defaultValues,
    isTableVariant = false,
    children,
    onSubmit,
    onAutoSubmit,
    onClose,
    onInfo,
  } = props;

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

  const isSubmitDisabled = !isValid || !isDirty;
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
    <form
      onSubmit={handleSubmitForm}
      className={`flex gap-1 bg-[var(--color-form-background)] ${isTableVariant ? '' : 'rounded-xl p-4'} `}
    >
      <div className="grow">{children({ control: control as Control<FieldValues> })}</div>
      <FormControlGroup isDisabled={isSubmitDisabled} onClose={onClose} onInfo={onInfo} />
    </form>
  );
};
