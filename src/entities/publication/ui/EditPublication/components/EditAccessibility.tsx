import { Activity } from 'react';

import {
  accessibilityExceptionOptions,
  FORM_FIELDS,
  getAccessibilityStandardOptions,
  HELPER_TEXT,
  IDs,
} from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { AccessibilityExceptionType, AccessibilityStandardType } from '@/src/shared/types';
import {
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  ListSubheader,
  MenuItem,
  MultipleContentWrapper,
  Preview,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOptionToString, prettifyUrlPreview } from '@/src/shared/utils';

import type { PublicationAccessibilityForm, PublicationType } from '../../../model/publication.types';
import { accessibilityValidationSchema } from '../../../model/publication.validation';

type EditAccessibilityProps = {
  publicationType: PublicationType;
  standards: AccessibilityStandardType[];
  exception: AccessibilityExceptionType | null;
  reportUrl: string;
  onSubmit?: (data: PublicationAccessibilityForm) => void;
  onDelete?: () => void;
};

const {
  PUBLICATION_ACCESSIBILITY,
  PUBLICATION_ACCESSIBILITY_STANDARD,
  PUBLICATION_ACCESSIBILITY_EXCEPTION,
  PUBLICATION_ACCESSIBILITY_REPORT_URL,
} = FORM_FIELDS;

const { PUBLICATION_ACCESSIBILITY: PUBLICATION_ACCESSIBILITY_HELPER_TEXT } = HELPER_TEXT;

const EMPTY_STANDARDS: AccessibilityStandardType[] = [];

export const EditAccessibility = (props: EditAccessibilityProps) => {
  const { publicationType, standards = EMPTY_STANDARDS, exception, reportUrl = '', onSubmit, onDelete } = props;

  const { closeForm } = useFormStateMachine();

  const handleDelete = () => {
    onDelete?.();
    closeForm();
  };

  const handleSubmit = (data: PublicationAccessibilityForm) => {
    onSubmit?.({
      ...data,
      accessibilityException: data.accessibilityException || undefined,
    });
  };

  const standardOptions = getAccessibilityStandardOptions(publicationType).filter(({ group }) => group === undefined);
  const additionalStandardOptions = getAccessibilityStandardOptions(publicationType).filter(
    ({ group }) => group !== undefined,
  );

  const hasValues = standards.length > 0 || !!exception || !!reportUrl;

  const previewParts = [
    standards.length > 0 ? convertOptionToString(standards.join(', ')) : '',
    exception ? convertOptionToString(exception) : '',
    reportUrl ? prettifyUrlPreview(reportUrl) : '',
  ].filter(Boolean);

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ACCESSIBILITY}
      defaultValues={{
        [PUBLICATION_ACCESSIBILITY_STANDARD.name]: standards ?? [],
        [PUBLICATION_ACCESSIBILITY_EXCEPTION.name]: exception ?? undefined,
        [PUBLICATION_ACCESSIBILITY_REPORT_URL.name]: reportUrl,
      }}
      validationSchema={accessibilityValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      faq={PUBLICATION_ACCESSIBILITY_HELPER_TEXT}
      formFields={({ control }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel
              label={PUBLICATION_ACCESSIBILITY_STANDARD.label}
              id={PUBLICATION_ACCESSIBILITY_STANDARD.name}
            />
            <FormFieldWithControlsWrapper>
              <FormTextField
                control={control}
                select
                name={PUBLICATION_ACCESSIBILITY_STANDARD.name}
                id={PUBLICATION_ACCESSIBILITY_STANDARD.name}
                fullWidth
                slotProps={{ select: { multiple: true } }}
              >
                {standardOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
                <Activity mode={additionalStandardOptions.length > 0 ? 'visible' : 'hidden'}>
                  <ListSubheader className="text-center font-bold text-inherit"><TranslatedContent content="additional standards" /></ListSubheader>
                </Activity>
                {additionalStandardOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </FormTextField>
              <DeleteButton onClick={handleDelete} disabled={!hasValues} />
            </FormFieldWithControlsWrapper>
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel
              label={PUBLICATION_ACCESSIBILITY_EXCEPTION.label}
              id={PUBLICATION_ACCESSIBILITY_EXCEPTION.name}
            />
            <FormTextField
              control={control}
              options={accessibilityExceptionOptions}
              select
              name={PUBLICATION_ACCESSIBILITY_EXCEPTION.name}
              id={PUBLICATION_ACCESSIBILITY_EXCEPTION.name}
              fullWidth
            />
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel
              label={PUBLICATION_ACCESSIBILITY_REPORT_URL.label}
              id={PUBLICATION_ACCESSIBILITY_REPORT_URL.name}
            />
            <FormTextField
              control={control}
              name={PUBLICATION_ACCESSIBILITY_REPORT_URL.name}
              id={PUBLICATION_ACCESSIBILITY_REPORT_URL.name}
              isUrlField
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_ACCESSIBILITY.label}
          value={previewParts.length > 0 ? previewParts.join(', ') : ''}
          disabled={disabled}
          onEdit={onEdit}
          capitalize
        >
          {previewParts.length > 0 && <Typography>{previewParts.join(', ')}</Typography>}
        </Preview>
      )}
    />
  );
};
