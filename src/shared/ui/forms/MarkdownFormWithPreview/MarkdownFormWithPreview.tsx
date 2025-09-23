'use client';

import { FieldValues } from 'react-hook-form';

import { MarkdownPreview } from '../..';
import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';
import MarkdownField from '../MarkdownField/MarkdownField';
import MarkdownSwitch from '../MarkdownSwitch/MarkdownSwitch';

type MarkdownFormWithPreviewProps<T extends FieldValues> = {
  defaultValue?: string;
  disableLineBreaks?: boolean;
  extendedToolbar?: boolean;
} & Omit<FormWithPreviewProps<T>, 'preview' | 'children' | 'isDisabled' | 'defaultValues'>;

const MarkdownFormWithPreview = <T extends FieldValues>(props: MarkdownFormWithPreviewProps<T>) => {
  const {
    validationSchema,
    label,
    name,
    id,
    defaultValue,
    extendedToolbar = false,
    disableLineBreaks = false,
    onSubmit,
  } = props;

  return (
    <FormWithPreview
      validationSchema={validationSchema}
      label={label}
      name={name}
      id={id}
      defaultValues={{ [name]: defaultValue }}
      onSubmit={onSubmit}
      preview={(value) => <MarkdownPreview source={value} />}
    >
      {({ control }) => (
        <MarkdownField
          extendedToolbar={extendedToolbar}
          name={name}
          control={control}
          disableLineBreaks={disableLineBreaks}
          id={id}
        >
          <MarkdownSwitch />
        </MarkdownField>
      )}
    </FormWithPreview>
  );
};

export default MarkdownFormWithPreview;
