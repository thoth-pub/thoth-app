import { Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import type { LanguageRelation } from '@/gql/graphql';
import { appConfig, isDefaultId } from '@/src/shared';
import { FORM_FIELDS, languageOptions, languageRelationOptions } from '@/src/shared/constants/formFields';
import {
  AddButton,
  AutocompleteField,
  DeleteButton,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
} from '@/src/shared/ui';

import { LanguagesForm } from '../../model/language.types';

type FormFieldsProps = {
  control: Control<LanguagesForm>;
  onDelete?: (id: string) => void;
};

const { LANGUAGES, LANGUAGE, LANGUAGE_RELATION } = FORM_FIELDS;

const fieldsDefaultValues = {
  languageId: appConfig.defaultId,
  isMain: false,
  [LANGUAGE.name]: languageOptions[0],
  [LANGUAGE_RELATION.name]: languageRelationOptions[0].value as LanguageRelation,
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const { control, onDelete } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: LANGUAGES.name,
  });

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
              <InputLabel>{LANGUAGE.label}</InputLabel>
              <FormFieldWithControlsWrapper>
                <AutocompleteField
                  name={getLanguageFieldName(index)}
                  control={control}
                  fullWidth
                  options={languageOptions}
                />
                <DeleteButton onDelete={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>

            <FormFieldWrapper>
              <InputLabel>{LANGUAGE_RELATION.label}</InputLabel>
              <FormTextField
                name={getLanguageRelationFieldName(index)}
                control={control}
                select
                options={languageRelationOptions}
              />
            </FormFieldWrapper>
          </li>
        ))}
      </ul>

      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {LANGUAGES.label}
        </InputLabel>
        <AddButton type="button" className="mt-[2rem] mr-auto" onAdd={handleAdd}>
          Add New Language
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
