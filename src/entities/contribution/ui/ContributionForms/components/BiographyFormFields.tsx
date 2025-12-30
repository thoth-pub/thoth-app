'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { appConfig, HELPER_TEXT } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import {
  AddButton,
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  LanguageField,
  MarkdownField,
} from '@/src/shared/ui';

import type { ContributionBiographyForm } from '../../../model/contribution.types';

const { BIOGRAPHIES, CONTRIBUTOR_BIOGRAPHY, LANGUAGE } = FORM_FIELDS;
const { CONTRIBUTOR_BIOGRAPHY: CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT } = HELPER_TEXT;

type BiographyFormFieldsProps = {
  control: Control<ContributionBiographyForm>;
  recommended?: boolean;
  isHelperTextVisible?: boolean;
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const fieldsDefaultValues = {
  biographyId: appConfig.defaultId,
  [CONTRIBUTOR_BIOGRAPHY.name]: '',
  [LANGUAGE.name]: languageOptionsAlt[0],
};

export const BiographyFormFields = (props: BiographyFormFieldsProps) => {
  const { control, recommended, isHelperTextVisible } = props;

  const { t } = useTranslation();

  const { fields, append, remove } = useFieldArray({
    control,
    name: BIOGRAPHIES.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(fieldsDefaultValues);
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

    // if (item.biographyId && onDelete && !isDefaultId(item.biographyId)) {
    //   onDelete?.(item.biographyId);
    // }

    remove(index);
  };

  const handleAdd = () => {
    append({ ...fieldsDefaultValues, biographyId: `${appConfig.defaultId}-${fields.length + 1}` });
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
                  helperText={isHelperTextVisible ? CONTRIBUTOR_BIOGRAPHY_HELPER_TEXT : ''}
                  disableLineBreaks
                />
                {index > 0 && <DeleteButton onClick={() => handleRemove(index)} />}
              </FormFieldWithControlsWrapper>
            </ContentWrapper>
            <ContentWrapper>
              <br />
              <div className="flex flex-col gap-2">
                <div className="max-w-min">
                  <LanguageField control={control} languageFieldName={getLanguageFieldName(index)} />
                </div>
                {index === fields.length - 1 && (
                  <AddButton type="button" className="mr-auto pl-2 capitalize" onAdd={handleAdd}>
                    {t('add new translation')}
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
