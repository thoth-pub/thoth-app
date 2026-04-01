import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { ContributionNamesForm } from '../../../model/contribution.types';
import { namesFormValidationSchema } from '../../../model/contribution.validation';

const { FULL_NAME, FIRST_NAME, LAST_NAME } = FORM_FIELDS;
const { FULL_NAME: FULL_NAME_HELPER_TEXT } = HELPER_TEXT;

type EditNamesProps = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  recommended: boolean;
  onSubmit: (data: ContributionNamesForm) => void;
};

export const EditNames = ({ fullName, firstName, lastName, recommended, onSubmit }: EditNamesProps) => {
  const firstNameValue = firstName ?? '';
  const lastNameValue = lastName ?? '';
  const fullNameValue = fullName ?? '';

  const showFullNameIndicator = recommended && !fullNameValue;
  const showFirstNameIndicator = recommended && !firstNameValue;
  const showLastNameIndicator = recommended && !lastNameValue;

  const showPreviewIndicator = showFullNameIndicator || showFirstNameIndicator || showLastNameIndicator;

  return (
    <EditableContent
      isTableVariant
      formId={IDs.CONTRIBUTOR_NAMES}
      defaultValues={{ [FULL_NAME.name]: fullName, [FIRST_NAME.name]: firstName, [LAST_NAME.name]: lastName }}
      validationSchema={namesFormValidationSchema}
      onSubmit={onSubmit}
      borderTransparent
      faq={FULL_NAME_HELPER_TEXT}
      formFields={({ control }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={FIRST_NAME.label} id={FIRST_NAME.name} recommended={showFirstNameIndicator} />
            <FormTextField control={control} name={FIRST_NAME.name} id={FIRST_NAME.name} />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={LAST_NAME.label} id={LAST_NAME.name} recommended={showLastNameIndicator} />
            <FormTextField control={control} name={LAST_NAME.name} id={LAST_NAME.name} />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={FULL_NAME.label} id={FULL_NAME.name} recommended={showFullNameIndicator} />
            <FormTextField control={control} name={FULL_NAME.name} id={FULL_NAME.name} />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={FULL_NAME.label}
          value={fullName}
          recommended={showPreviewIndicator}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
