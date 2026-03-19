import { Control } from 'react-hook-form';

import { LocaleCode } from '@/gql/graphql';
import { FORM_FIELDS, HELPER_TEXT, IDs, languageOptionsAlt } from '@/src/shared/constants';
import { Chip, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { BiographyEntity, ContributionBiographyForm } from '../../../model/contribution.types';
import { contributorBiographyValidationSchema } from '../../../model/contribution.validation';
import { BiographyFormFields } from './BiographyFormFields';

type EditBiographyProps = {
  contributionId: string;
  biographies: BiographyEntity[];
  recommended?: boolean;
  defaultLocaleOption?: { value: LocaleCode; label: string };
  onSubmit: (data: ContributionBiographyForm) => void;
};

const { BIOGRAPHIES } = FORM_FIELDS;
const { CONTRIBUTOR_BIOGRAPHY: CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT } = HELPER_TEXT;

export const EditBiography = (props: EditBiographyProps) => {
  const { contributionId, biographies, recommended = false, defaultLocaleOption, onSubmit } = props;

  const filteredBiographies = biographies.filter((biography) => biography.contributionId === contributionId);

  const showPreviewIndicator = recommended && filteredBiographies.length === 0;

  const canonicalBiography = filteredBiographies.find((biography) => biography.canonical);

  const placeholder = canonicalBiography?.content ?? '';

  const defaultValues = filteredBiographies.map(({ id, localeCode, content }) => {
    const language = languageOptionsAlt.find((option) => option.value.toLowerCase() === localeCode.toLowerCase());

    return {
      biographyId: id,
      language: language ?? defaultLocaleOption,
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
      faq={CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT}
      formFields={({ control }) => (
        <BiographyFormFields
          control={control as unknown as Control<ContributionBiographyForm>}
          recommended={showPreviewIndicator}
          defaultLocaleOption={defaultLocaleOption}
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
