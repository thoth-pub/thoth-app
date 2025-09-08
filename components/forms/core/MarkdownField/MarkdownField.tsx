import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { MarkdownEditor, type MarkdownEditorProps } from '@/components/core';
import { BaseFieldProps } from '@/interfaces';

type MarkdownFieldProps<T extends FieldValues> = BaseFieldProps<T> & Omit<MarkdownEditorProps, 'value'>;

export const MarkdownField = <T extends FieldValues>(props: MarkdownFieldProps<T>) => {
  const { control, name, defaultValue, onSave } = props;

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <>
          <MarkdownEditor value={value} onChange={onChange} onSave={onSave} disableLineBreaks />
          <p>{`Error: ${error?.message}`}</p>
        </>
      )}
    />
  );
};

export default MarkdownField;
