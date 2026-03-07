'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { LocaleCode } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, HELPER_TEXT, languageOptionsAlt } from '@/src/shared/constants';
import {
  AddButton,
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  LanguageField,
  MarkdownField,
  TranslatedContent,
} from '@/src/shared/ui';

import type { ContributionBiographyForm } from '../../../model/contribution.types';

const { BIOGRAPHIES, CONTRIBUTOR_BIOGRAPHY, LANGUAGE } = FORM_FIELDS;
const { CONTRIBUTOR_BIOGRAPHY: CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT } = HELPER_TEXT;

type BiographyFormFieldsProps = {
  control: Control<ContributionBiographyForm>;
  recommended?: boolean;
  isHelperTextVisible?: boolean;
  defaultLocaleOption?: { value: LocaleCode; label: string };
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const BiographyFormFields = (props: BiographyFormFieldsProps) => {
  const { control, recommended, isHelperTextVisible, defaultLocaleOption } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: BIOGRAPHIES.name,
  });

  const fieldsDefaultValues = {
    biographyId: appConfig.defaultId,
    [CONTRIBUTOR_BIOGRAPHY.name]: '',
    [LANGUAGE.name]: defaultLocaleOption,
  };

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    if (defaultLocaleOption) {
      append({ ...fieldsDefaultValues, [LANGUAGE.name]: defaultLocaleOption });
      return;
    }

    append({ ...fieldsDefaultValues, [LANGUAGE.name]: languageOptionsAlt[0] });
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${BIOGRAPHIES.name}.${fieldIndex}.${fieldName}`;
  };

  const getBiographyFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, CONTRIBUTOR_BIOGRAPHY.name);
  };

  const getLanguageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANGUAGE.name);
  };

  const handleRemove = (index: number) => {
    if (index === 0) return;

    const item = fields[index];

    if (!item) return;

    remove(index);
  };

  const handleAdd = () => {
    if (defaultLocaleOption) {
      append({
        ...fieldsDefaultValues,
        [LANGUAGE.name]: defaultLocaleOption,
        biographyId: `${appConfig.defaultId}-${fields.length + 1}`,
      });
      return;
    }

    append({
      ...fieldsDefaultValues,
      [LANGUAGE.name]: languageOptionsAlt[0],
      biographyId: `${appConfig.defaultId}-${fields.length + 1}`,
    });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <ContentWrapper>
              <FormFieldLabel
                label={CONTRIBUTOR_BIOGRAPHY.label}
                id={CONTRIBUTOR_BIOGRAPHY.name}
                recommended={recommended}
              />
              <FormFieldWithControlsWrapper>
                <MarkdownField
                  control={control}
                  name={getBiographyFieldName(index)}
                  id={getBiographyFieldName(index)}
                  className="w-full"
                  helperText={CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                  disableLineBreaks
                  extendedToolbar
                />
                {index > 0 && <DeleteButton onClick={() => handleRemove(index)} />}
              </FormFieldWithControlsWrapper>
            </ContentWrapper>
            <ContentWrapper>
              <br />
              <div className="flex flex-col gap-2">
                <div className="ml-auto max-w-min">
                  <LanguageField control={control} languageFieldName={getLanguageFieldName(index)} />
                </div>
                {index === fields.length - 1 && (
                  <AddButton type="button" className="mr-auto pl-2 capitalize" onAdd={handleAdd}>
                    <TranslatedContent content="actions.addNewTranslation" />
                  </AddButton>
                )}
              </div>
            </ContentWrapper>
          </li>
        ))}
      </ul>
    </>
  );
};
