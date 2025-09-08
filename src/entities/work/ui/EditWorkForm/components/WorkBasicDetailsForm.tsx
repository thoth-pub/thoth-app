'use client';

import MDEditor from '@uiw/react-md-editor';

import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import { FormFieldWithPreview, InputLabel, MarkdownField, Switch, Typography } from '@/src/shared/ui';

import { FormAccordionSection } from './FormAccordionSection';
import { useWorkBasicDetailsForm } from './hooks/useWorkBasicDetailsForm';

const {
  FORM_FIELDS: { WORK_TITLE: WORK_TITLE_ID },
  FORM_SECTIONS: { BASIC_DETAILS },
} = IDs;

const { WORK_TITLE } = FORM_FIELDS;

// TODO: refactor this component
export const WorkBasicDetailsForm = () => {
  const { control, formState, submit } = useWorkBasicDetailsForm();

  return (
    <FormAccordionSection title="Basic Details" panelId={BASIC_DETAILS}>
      <div className="flex">
        <InputLabel className="min-w-[10rem]" htmlFor={WORK_TITLE_ID}>
          {WORK_TITLE.label}
        </InputLabel>

        <form className="flex grow flex-row hover:[&>div>button]:opacity-100" onSubmit={submit}>
          <FormFieldWithPreview
            formField={
              <MarkdownField name={WORK_TITLE.name} control={control} disableLineBreaks>
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
            }
            preview={
              <MDEditor.Markdown
                source={formState.workTitle}
                style={{
                  whiteSpace: 'pre-wrap',
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--color-markdown-preview-text)',
                }}
              />
            }
          />
        </form>
      </div>
    </FormAccordionSection>
  );
};
