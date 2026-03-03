import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@mui/material';
import {
  type Control,
  type DefaultValues,
  type FieldValues,
  SubmitHandler,
  useForm,
  type UseFormReset,
  type UseFormSetValue,
  type ValidationMode,
} from 'react-hook-form';
import type { ZodType } from 'zod';

import { useIsDesktop } from '@/src/shared/hooks';
import { mergeStyles } from '@/src/shared/utils';

import ModalWrapper from '../../core/ModalWrapper/ModalWrapper';
import FormControlGroup from '../../forms/FormControlGroup/FormControlGroup';

export type FormProps<T extends FieldValues> = {
  validationSchema: ZodType<unknown, FieldValues>;
  defaultValues?: DefaultValues<T>;
  className?: string;
  controlsClassName?: string;
  isTableVariant?: boolean;
  validationMode?: keyof ValidationMode;
  borderTransparent?: boolean;
  children: (props: {
    control: Control<FieldValues>;
    reset: UseFormReset<FieldValues>;
    setValue: UseFormSetValue<FieldValues>;
  }) => Readonly<React.ReactNode>;
  onSubmit: SubmitHandler<T>;
  onClose: () => void;
  onInfo: () => void;
};

export const FormWrapper = <T extends FieldValues>(props: FormProps<T>) => {
  const {
    validationSchema,
    defaultValues,
    isTableVariant = false,
    borderTransparent = false,
    validationMode = 'onChange',
    controlsClassName,
    className,
    children,
    onSubmit,
    onClose,
    onInfo,
  } = props;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid, isDirty },
  } = useForm({
    resolver: zodResolver(validationSchema),
    mode: validationMode,
    defaultValues,
  });

  const isDesktop = useIsDesktop(980);

  const isSubmitDisabled = !isValid || !isDirty;

  const handleSubmitForm = handleSubmit((data) => {
    onSubmit(data as T);
  });

  return (
    <>
      {isDesktop || (!isDesktop && isTableVariant) ? (
        <form
          onSubmit={handleSubmitForm}
          className={mergeStyles(
            `flex gap-1 ${borderTransparent ? '' : 'border border-(--color-hover-border)'} bg-(--color-form-background) ${isTableVariant ? '' : 'rounded-xl p-4'} `,
            className,
          )}
        >
          <div className="grow">{children({ control: control as Control<FieldValues>, reset, setValue })}</div>
          <FormControlGroup
            isDisabled={isSubmitDisabled}
            onClose={onClose}
            onInfo={onInfo}
            className={controlsClassName}
          />
        </form>
      ) : (
        <Modal open>
          <ModalWrapper>
            <form
              onSubmit={handleSubmitForm}
              className={mergeStyles('flex gap-1 rounded-xl bg-(--color-form-background) p-4', className)}
            >
              <div className="grow">{children({ control: control as Control<FieldValues>, reset, setValue })}</div>
              <FormControlGroup
                isDisabled={isSubmitDisabled}
                onClose={onClose}
                onInfo={onInfo}
                className={controlsClassName}
              />
            </form>
          </ModalWrapper>
        </Modal>
      )}
    </>
  );
};
