'use client';

import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { BaseFieldProps } from '@/src/shared/interfaces';
import { MarkdownEditor, type MarkdownEditorProps } from '@/src/shared/ui';

type MarkdownFieldProps<T extends FieldValues> = BaseFieldProps<T> & Omit<MarkdownEditorProps, 'value'>;

const MarkdownField = <T extends FieldValues>(props: MarkdownFieldProps<T>) => {
  const { control, name, defaultValue, children, id, disableLineBreaks, extendedToolbar } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
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
      )}
    />
  );
};

export default MarkdownField;
