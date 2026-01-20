'use client';

import { Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import type { LanguageRelation } from '@/gql/graphql';
import { appConfig, getLanguageRelationOptions, HELPER_TEXT, isDefaultId } from '@/src/shared';
import { FORM_FIELDS, languageOptions } from '@/src/shared/constants/formFields';
import {
  AddButton,
  AutocompleteField,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
} from '@/src/shared/ui';

import { LanguagesForm } from '../../model/language.types';

type FormFieldsProps = {
  control: Control<LanguagesForm>;
  isHelperTextVisible?: boolean;
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

const { LANGUAGES, LANGUAGE, LANGUAGE_RELATION } = FORM_FIELDS;
const { WORK_LANGUAGE: WORK_LANGUAGE_HELPER_TEXT, WORK_LANGUAGE_RELATION: WORK_LANGUAGE_RELATION_HELPER_TEXT } = HELPER_TEXT;

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const { control, isHelperTextVisible = false, onDelete, onClose } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: LANGUAGES.name,
  });

  const { t, i18n } = useTranslation();
  const languageRelationOptions = getLanguageRelationOptions(i18n.language);

  const fieldsDefaultValues = {
    languageId: appConfig.defaultId,
    isMain: false,
    [LANGUAGE.name]: languageOptions[0],
    [LANGUAGE_RELATION.name]: languageRelationOptions[0].value as LanguageRelation,
  };

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(fieldsDefaultValues);
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${LANGUAGES.name}.${fieldIndex}.${fieldName}`;
  };

  const getLanguageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANGUAGE.name);
  };

  const getLanguageRelationFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANGUAGE_RELATION.name);
  };

  const handleRemove = (index: number) => {
    const item = fields[index];

    if (item && item.languageId && onDelete && !isDefaultId(item.languageId)) {
      onDelete(item.languageId);
    }

    remove(index);

    if (fields.length === 1) {
      onClose?.();
    }
  };

  const handleAdd = () => {
    append({ ...fieldsDefaultValues, languageId: `${appConfig.defaultId}-${fields.length + 1}` });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <FormFieldWrapper>
              <FormFieldLabel label={LANGUAGE.label} id={LANGUAGE.name} />
              <FormFieldWithControlsWrapper>
                <AutocompleteField
                  name={getLanguageFieldName(index)}
                  control={control}
                  fullWidth
                  id={getLanguageFieldName(index)}
                  options={languageOptions}
                  isHelperTextVisible={isHelperTextVisible}
                  helperText={WORK_LANGUAGE_HELPER_TEXT}
                />
                <DeleteButton onClick={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>

            <FormFieldWrapper>
              <FormFieldLabel label={LANGUAGE_RELATION.label} id={LANGUAGE_RELATION.name} />
              <FormTextField
                name={getLanguageRelationFieldName(index)}
                control={control}
                id={getLanguageRelationFieldName(index)}
                select
                options={languageRelationOptions}
                isHelperTextVisible={isHelperTextVisible}
                helperText={WORK_LANGUAGE_RELATION_HELPER_TEXT}
              />
            </FormFieldWrapper>
          </li>
        ))}
      </ul>

      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {LANGUAGES.label}
        </InputLabel>
        <AddButton type="button" className="mt-4 mr-auto capitalize xl:mt-8" onAdd={handleAdd}>
          {t('add new language')}
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
