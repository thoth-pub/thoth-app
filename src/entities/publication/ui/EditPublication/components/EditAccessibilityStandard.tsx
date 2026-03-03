import { Activity } from 'react';

import { FORM_FIELDS, getAccessibilityStandardOptions, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { AccessibilityStandardType } from '@/src/shared/types';
import {
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  ListSubheader,
  MenuItem,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOptionToString } from '@/src/shared/utils';

import type { PublicationAccessibilityStandardForm, PublicationType } from '../../../model/publication.types';
import { accessibilityStandardValidationSchema } from '../../../model/publication.validation';

type EditAccessibilityStandardProps = {
  publicationType: PublicationType;
  standards: AccessibilityStandardType[];
  onSubmit?: (data: AccessibilityStandardType[]) => void;
  onDelete?: () => void;
};

const { PUBLICATION_ACCESSIBILITY_STANDARD } = FORM_FIELDS;

const { PUBLICATION_ACCESSIBILITY_STANDARD: PUBLICATION_ACCESSIBILITY_STANDARD_HELPER_TEXT } = HELPER_TEXT;

export const EditAccessibilityStandard = (props: EditAccessibilityStandardProps) => {
  const { publicationType, standards = [], onSubmit, onDelete } = props;

  const handleSubmit = (data: PublicationAccessibilityStandardForm) => {
    onSubmit?.(data.accessibilityStandard);
  };

  const standardOptions = getAccessibilityStandardOptions(publicationType).filter(({ group }) => group === undefined);
  const additionalStandardOptions = getAccessibilityStandardOptions(publicationType).filter(
    ({ group }) => group !== undefined,
  );

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ACCESSIBILITY_STANDARD}
      defaultValues={{ [PUBLICATION_ACCESSIBILITY_STANDARD.name]: standards ?? [] }}
      validationSchema={accessibilityStandardValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
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
              helperText={isHelperTextVisible ? PUBLICATION_ACCESSIBILITY_STANDARD_HELPER_TEXT : ''}
              fullWidth
              slotProps={{ select: { multiple: true } }}
            >
              {standardOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
              <Activity mode={additionalStandardOptions.length > 0 ? 'visible' : 'hidden'}>
                <ListSubheader className="text-center font-bold text-inherit">Additional Standards</ListSubheader>
              </Activity>
              {additionalStandardOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </FormTextField>
            <DeleteButton onClick={onDelete} disabled={standards.length === 0} />
          </FormFieldWithControlsWrapper>
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_ACCESSIBILITY_STANDARD.label}
          value={convertOptionToString(standards.join(', '))}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
