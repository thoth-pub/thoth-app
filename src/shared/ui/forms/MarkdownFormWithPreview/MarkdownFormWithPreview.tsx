'use client';

import MDEditor from '@uiw/react-md-editor';
import { FieldValues } from 'react-hook-form';

import Switch from '../../core/Switch/Switch';
import Typography from '../../core/Typography/Typography';
import FormWithPreview, { type FormWithPreviewProps } from '../FormWithPreview/FormWithPreview';
import MarkdownField from '../MarkdownField/MarkdownField';

type MarkdownFormWithPreviewProps = { defaultValue?: string } & Omit<
  FormWithPreviewProps<FieldValues>,
  'preview' | 'children' | 'isDisabled' | 'defaultValues'
>;

const MarkdownFormWithPreview = (props: MarkdownFormWithPreviewProps) => {
  const { validationSchema, label, name, id, defaultValue } = props;

  return (
    <FormWithPreview
      validationSchema={validationSchema}
      label={label}
      name={name}
      id={id}
      defaultValues={{ [name]: defaultValue }}
      preview={(value, isValueHighlighted) => (
        <MDEditor.Markdown
          source={value}
          style={{
            whiteSpace: 'pre-wrap',
            width: '100%',
            backgroundColor: 'transparent',
            color: isValueHighlighted ? 'var(--color-markdown-preview-text-alt)' : 'var(--color-markdown-preview-text)',
          }}
        />
      )}
    >
      {({ control }) => (
        <MarkdownField name={name} control={control} disableLineBreaks id={id}>
          <div className="flex items-start gap-1 pt-2">
            <Typography variant="body2" color="primary">
              JATS
            </Typography>
            <Switch defaultChecked size="small" className="-mt-0.5" />
            <Typography variant="body2" color="primary">
              Markdown
            </Typography>
          </div>
        </MarkdownField>
      )}
    </FormWithPreview>
  );
};

export default MarkdownFormWithPreview;
