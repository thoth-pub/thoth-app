'use client';

import MDEditor from '@uiw/react-md-editor';

import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import { FormWithPreview, MarkdownField, Switch, Typography } from '@/src/shared/ui';

import { titleValidationSchema } from '../../../model/work.validation';
import { FormAccordionSection } from './FormAccordionSection';

const {
  FORM_SECTIONS: { BASIC_DETAILS },
  FORM_FIELDS: { WORK_TITLE: WORK_TITLE_ID },
} = IDs;

const { WORK_TITLE } = FORM_FIELDS;

export const WorkBasicDetailsForm = () => {
  return (
    <FormAccordionSection title="Basic Details" panelId={BASIC_DETAILS} defaultExpanded>
      <div className="flex">
        <div className="flex grow flex-row hover:[&>div>button]:opacity-100">
          <FormWithPreview
            validationSchema={titleValidationSchema}
            label={WORK_TITLE.label}
            name={WORK_TITLE.name}
            id={WORK_TITLE_ID}
            preview={(value, isValueHighlighted) => (
              <MDEditor.Markdown
                source={value}
                style={{
                  whiteSpace: 'pre-wrap',
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: isValueHighlighted
                    ? 'var(--color-markdown-preview-text-alt)'
                    : 'var(--color-markdown-preview-text)',
                }}
              />
            )}
          >
            {({ control }) => (
              <MarkdownField name={WORK_TITLE.name} control={control} disableLineBreaks id={WORK_TITLE_ID}>
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
        </div>
      </div>
    </FormAccordionSection>
  );
};
