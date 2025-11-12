'use client';

import { useTranslation } from 'react-i18next';

import type { ContributionType } from '@/src/entities/contributor/model/contributor.types';
import { getContributorTypeOptions, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { ContributionTypeForm } from '../../../model/contribution.types';
import { contributorTypeValidationSchema } from '../../../model/contribution.validation';

const { CONTRIBUTOR_TYPE } = FORM_FIELDS;
const { CONTRIBUTOR_TYPE: CONTRIBUTOR_TYPE_HELPER_TEXT } = HELPER_TEXT;

type EditTypeProps = {
  contributorType: ContributionType;
  skipAutosave?: boolean;
  onSubmit: (data: ContributionTypeForm) => void;
};

export const EditType = (props: EditTypeProps) => {
  const { contributorType, skipAutosave, onSubmit } = props;
  const { t, i18n } = useTranslation();
  const contributorTypeOptions = getContributorTypeOptions(i18n.language);

  const defaultValue =
    contributorTypeOptions.find((option) => option.value === contributorType) ?? contributorTypeOptions[0];

  return (
    <EditableContent
      skipAutoSubmit={skipAutosave}
      isTableVariant
      formId={IDs.CONTRIBUTOR_TYPE}
      defaultValues={{ [CONTRIBUTOR_TYPE.name]: defaultValue.value as ContributionType }}
      validationSchema={contributorTypeValidationSchema}
      onSubmit={onSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={CONTRIBUTOR_TYPE.label} id={CONTRIBUTOR_TYPE.name} />
          <FormTextField
            control={control}
            name={CONTRIBUTOR_TYPE.name}
            select
            options={contributorTypeOptions}
            id={CONTRIBUTOR_TYPE.name}
            helperText={CONTRIBUTOR_TYPE_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview capitalize label={CONTRIBUTOR_TYPE.label} value={t(defaultValue.label)} onEdit={onEdit} />
      )}
    />
  );
};
