'use client';

import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { BaseFieldProps } from '@/src/shared/interfaces';
import { MarkdownEditor, type MarkdownEditorProps, TranslatedContent } from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

import FormHelperText from '../../core/FormHelperText/FormHelperText';

type MarkdownFieldProps<T extends FieldValues> = { helperText?: string; className?: string } & BaseFieldProps<T> &
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
    helperText = '',
    isHelperTextVisible,
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
          {isHelperTextVisible && (
            <FormHelperText className="mt-4">
              <TranslatedContent content={helperText} namespace={NAMESPACES.enum.forms} />
            </FormHelperText>
          )}
        </div>
      )}
    />
  );
};

export default MarkdownField;
