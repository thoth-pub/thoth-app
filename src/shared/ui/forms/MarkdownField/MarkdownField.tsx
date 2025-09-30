'use client';

import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { BaseFieldProps } from '@/src/shared/interfaces';
import { MarkdownEditor, type MarkdownEditorProps } from '@/src/shared/ui';

import FormHelperText from '../../core/FormHelperText/FormHelperText';

type MarkdownFieldProps<T extends FieldValues> = { helperText?: string } & BaseFieldProps<T> &
  Omit<MarkdownEditorProps, 'value'>;

const MarkdownField = <T extends FieldValues>(props: MarkdownFieldProps<T>) => {
  const { control, name, defaultValue, children, id, disableLineBreaks, extendedToolbar, helperText } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <div className="flex flex-col">
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
          <FormHelperText>{helperText}</FormHelperText>
        </div>
      )}
    />
  );
};

export default MarkdownField;
