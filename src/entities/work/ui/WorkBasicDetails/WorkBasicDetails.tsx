'use client';

import MDEditor from '@uiw/react-md-editor';

import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import type { FormFieldOption } from '@/src/shared/interfaces';
import {
  AccordionSection,
  FormsWrapper,
  FormWithPreview,
  MarkdownField,
  Switch,
  TextField,
  Typography,
} from '@/src/shared/ui';

import type { WorkType } from '../../model/work.types';
import {
  copyrightHolderValidationSchema,
  editionValidationSchema,
  licenseValidationSchema,
  titleValidationSchema,
  workTypeValidationSchema,
} from '../../model/work.validation';

const {
  FORM_SECTIONS: { BASIC_DETAILS },
  FORM_FIELDS: {
    WORK_TITLE: WORK_TITLE_ID,
    EDITION: EDITION_ID,
    IMPRINT: IMPRINT_ID,
    WORK_TYPE: WORK_TYPE_ID,
    LICENSE: LICENSE_ID,
    COPYRIGHT_HOLDER: COPYRIGHT_HOLDER_ID,
    LANDING_PAGE: LANDING_PAGE_ID,
  },
} = IDs;

const { WORK_TITLE, EDITION, IMPRINT, WORK_TYPE, LICENSE, COPYRIGHT_HOLDER, LANDING_PAGE } = FORM_FIELDS;

type WorkBasicDetailsProps = {
  title: string;
  workType: WorkType;
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
};

const WorkBasicDetails = ({ title, workType, imprintOptions, workTypeOptions }: WorkBasicDetailsProps) => {
  return (
    <AccordionSection title="Basic Details" panelId={BASIC_DETAILS} defaultExpanded>
      <FormsWrapper>
        <FormWithPreview
          validationSchema={titleValidationSchema}
          label={WORK_TITLE.label}
          name={WORK_TITLE.name}
          id={WORK_TITLE_ID}
          defaultValues={{ [WORK_TITLE.name]: title }}
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

        <FormWithPreview
          validationSchema={editionValidationSchema}
          label={EDITION.label}
          name={EDITION.name}
          id={EDITION_ID}
        >
          {({ control }) => <TextField control={control} name={EDITION.name} type={EDITION.type} fullWidth min={1} />}
        </FormWithPreview>

        <FormWithPreview
          validationSchema={editionValidationSchema}
          label={IMPRINT.label}
          name={IMPRINT.name}
          id={IMPRINT_ID}
        >
          {({ control }) => (
            <TextField control={control} name={IMPRINT.name} fullWidth select options={imprintOptions} />
          )}
        </FormWithPreview>

        <FormWithPreview
          validationSchema={workTypeValidationSchema}
          label={WORK_TYPE.label}
          name={WORK_TYPE.name}
          id={WORK_TYPE_ID}
          defaultValues={{ [WORK_TYPE.name]: workType }}
        >
          {({ control }) => (
            <TextField control={control} name={WORK_TYPE.name} fullWidth select options={workTypeOptions} />
          )}
        </FormWithPreview>

        <FormWithPreview
          validationSchema={licenseValidationSchema}
          label={LICENSE.label}
          name={LICENSE.name}
          id={LICENSE_ID}
        >
          {({ control }) => <TextField control={control} name={LICENSE.name} type={LICENSE.type} fullWidth />}
        </FormWithPreview>

        <FormWithPreview
          validationSchema={copyrightHolderValidationSchema}
          label={COPYRIGHT_HOLDER.label}
          name={COPYRIGHT_HOLDER.name}
          id={COPYRIGHT_HOLDER_ID}
        >
          {({ control }) => <TextField control={control} name={COPYRIGHT_HOLDER.name} fullWidth />}
        </FormWithPreview>

        <FormWithPreview
          validationSchema={licenseValidationSchema}
          label={LANDING_PAGE.label}
          name={LANDING_PAGE.name}
          id={LANDING_PAGE_ID}
        >
          {({ control }) => <TextField control={control} name={LANDING_PAGE.name} type={LANDING_PAGE.type} fullWidth />}
        </FormWithPreview>
      </FormsWrapper>
    </AccordionSection>
  );
};

export default WorkBasicDetails;
