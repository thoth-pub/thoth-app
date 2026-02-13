import { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import { Chip, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { BiographyEntity, ContributionBiographyForm } from '../../../model/contribution.types';
import { contributorBiographyValidationSchema } from '../../../model/contribution.validation';
import { BiographyFormFields } from './BiographyFormFields';

type EditBiographyProps = {
  contributionId: string;
  biographies: BiographyEntity[];
  recommended?: boolean;
  onSubmit: (data: ContributionBiographyForm) => void;
};

const { BIOGRAPHIES } = FORM_FIELDS;

export const EditBiography = (props: EditBiographyProps) => {
  const { contributionId, biographies, recommended = false, onSubmit } = props;

  const filteredBiographies = biographies.filter((biography) => biography.contributionId === contributionId);

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
      defaultValues={{ [BIOGRAPHIES.name]: defaultValues }}
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
            <div className="flex flex-col gap-2">
              <Typography component="span">
                <MarkdownPreview source={placeholder} />
              </Typography>
              <ul className="flex flex-wrap gap-1">
                {filteredBiographies.map(({ id, localeCode }) => (
                  <Chip key={id} label={localeCode} size="small" component="li" className="" />
                ))}
              </ul>
            </div>
          )}
        </Preview>
      )}
    />
  );
};
