import { Control } from 'react-hook-form';

import { IDs, isTextContainsAnyMarkdownTag } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { BiographyEntity, ContributionBiographyForm } from '../../../model/contribution.types';
import { contributorBiographyValidationSchema } from '../../../model/contribution.validation';
import { BiographyFormFields } from './BiographyFormFields';

const { BIOGRAPHIES, MARKDOWN_FORMAT } = FORM_FIELDS;

type EditBiographyProps = {
  contributionId: string;
  biographies: BiographyEntity[];
  recommended?: boolean;
  onSubmit: (data: ContributionBiographyForm) => void;
};

export const EditBiography = (props: EditBiographyProps) => {
  const { contributionId, biographies, recommended = false, onSubmit } = props;

  const filteredBiographies = biographies.filter((biography) => biography.contributionId === contributionId);
  const isMarkdownFormat = filteredBiographies.some((biography) => isTextContainsAnyMarkdownTag(biography.content));

  const showPreviewIndicator = recommended && filteredBiographies.length === 0;

  const canonicalBiography = filteredBiographies.find((biography) => biography.canonical);

  const placeholder = canonicalBiography?.content ?? '';

  const defaultValues = filteredBiographies.map(({ id, localeCode, content }) => {
    const language = languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase());

    return {
      biographyId: id,
      language: language ?? languageOptionsAlt[0],
      contributorBiography: content,
    };
  });

  return (
    <EditableContent
      isTableVariant
      formId={IDs.CONTRIBUTOR_BIOGRAPHY}
      defaultValues={{ [BIOGRAPHIES.name]: defaultValues, [MARKDOWN_FORMAT.name]: isMarkdownFormat }}
      validationSchema={contributorBiographyValidationSchema}
      onSubmit={onSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <BiographyFormFields
          control={control as unknown as Control<ContributionBiographyForm>}
          recommended={showPreviewIndicator}
          isHelperTextVisible={isHelperTextVisible}
        />
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={BIOGRAPHIES.label}
          value={placeholder}
          disabled={disabled}
          onEdit={onEdit}
          recommended={showPreviewIndicator}
        >
          {placeholder.length > 0 && (
            <Typography component="span">
              <MarkdownPreview source={placeholder} />
            </Typography>
          )}
        </Preview>
      )}
    />
  );
};
