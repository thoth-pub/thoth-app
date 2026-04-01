'use client';

import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { BaseFieldProps } from '@/src/shared/interfaces';
import { MarkdownEditor, type MarkdownEditorProps } from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

type MarkdownFieldProps<T extends FieldValues> = { className?: string } & BaseFieldProps<T> &
  Omit<MarkdownEditorProps, 'value'>;

const MarkdownField = <T extends FieldValues>(props: MarkdownFieldProps<T>) => {
  const {
    control,
    name,
    defaultValue,
    children,
    id,
    disableLineBreaks,
    extendedToolbar,
    className,
  } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <div className={mergeStyles('flex flex-col', className)}>
          <MarkdownEditor
            value={value}
            onChange={onChange}
            error={!!error}
            errorMessage={error?.message}
            disableLineBreaks={disableLineBreaks}
            id={id}
            extendedToolbar={extendedToolbar}
          >
            {children}
          </MarkdownEditor>
        </div>
      )}
    />
  );
};

export default MarkdownField;
