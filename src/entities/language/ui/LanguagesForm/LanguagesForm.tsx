import { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { LanguageRelation } from '@/gql/graphql';
import { convertOptionToString, IDs } from '@/src/shared';
import { FORM_FIELDS, languageOptions } from '@/src/shared/constants/formFields';
import { ButtonGroup, Chip, DeleteButton, FavoriteButton, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { LanguageEntity, LanguagesForm as LanguagesFormType } from '../../model/language.types';
import { languagesValidationSchema } from '../../model/language.validation';
import { FormFields } from './FormFields';

const { LANGUAGES } = FORM_FIELDS;

type LanguagesFormProps = Partial<{
  showRecommendations: boolean;
  languages: LanguageEntity[];
  onUpdate: (data: LanguagesFormType) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  onClose?: () => void;
}>;

const { LANGUAGE, LANGUAGE_RELATION } = FORM_FIELDS;

const LanguagesForm = (props: LanguagesFormProps) => {
  const { showRecommendations = false, languages = [], onUpdate, onDelete, onSelectAsMain, onClose } = props;

  const placeholder = languages.length > 0 ? languages.map(({ code }) => code).join(', ') : undefined;
  const { t } = useTranslation();

  const defaultValues = languages
    .map(({ code, relation, id, isMain }) => {
      const languageOption = languageOptions.find((option) => option.value.toLowerCase() === code.toLowerCase());

      if (!languageOption) return null;

      return {
        id: id,
        languageId: id,
        isMain,
        [LANGUAGE.name]: languageOption,
        [LANGUAGE_RELATION.name]: relation as LanguageRelation,
      };
    })
    .filter((item) => !!item);

  return (
    <EditableContent
      formId={IDs.WORK_LANGUAGES}
      validationSchema={languagesValidationSchema}
      onSubmit={(data) => onUpdate?.(data)}
      defaultValues={{ [LANGUAGES.name]: defaultValues }}
      formFields={({ control, isHelperTextVisible }) => (
        <FormFields isHelperTextVisible={isHelperTextVisible} control={control as unknown as Control<LanguagesFormType>} onDelete={onDelete} onClose={onClose} />
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={LANGUAGES.label}
          onEdit={onEdit}
          disabled={disabled}
          value={placeholder}
          recommended={showRecommendations}
          editButtonClassName="mt-1.5 lg:mt-0"
        >
          {placeholder && (
            <ul className="flex w-full flex-col gap-[var(--default-gap)]">
              {defaultValues.map(({ languageId, language: { label, value }, languageRelation, isMain }) => (
                <li key={languageId} className="flex items-center gap-1">
                  <Chip label={value} size="small" component="span" />
                  <Typography>
                    {label} ({t(convertOptionToString(languageRelation).toLowerCase())})
                  </Typography>
                  <ButtonGroup className="ml-auto">
                    <DeleteButton
                      onClick={() => onDelete?.(languageId)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                    <FavoriteButton isFavorite={isMain} onClick={() => onSelectAsMain?.(languageId)} />
                  </ButtonGroup>
                </li>
              ))}
            </ul>
          )}
        </Preview>
      )}
    />
  );
};

export default LanguagesForm;
