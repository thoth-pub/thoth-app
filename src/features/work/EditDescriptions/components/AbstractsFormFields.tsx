'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { LocaleCode } from '@/gql/graphql';
import type { WorkAbstractsForm } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants';
import type { AbstractId } from '@/src/shared/types';
import {
  AddButton,
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  LanguageField,
  MarkdownField,
} from '@/src/shared/ui';

const { WORK_ABSTRACTS, WORK_ABSTRACT, WORK_SHORT_ABSTRACT, LANGUAGE } = FORM_FIELDS;

type AbstractsFormFieldsProps = {
  control: Control<WorkAbstractsForm>;
  defaultLocaleOption?: { value: LocaleCode; label: string };
  deleteLoading?: boolean;
  onDelete?: (shortAbstractId: AbstractId, longAbstractId: AbstractId) => void;
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const AbstractsFormFields = (props: AbstractsFormFieldsProps) => {
  const { control, defaultLocaleOption, onDelete, deleteLoading = false } = props;

  const fieldsDefaultValues = {
    longAbstractId: appConfig.defaultId,
    shortAbstractId: appConfig.defaultId,
    [WORK_ABSTRACT.name]: '',
    [WORK_SHORT_ABSTRACT.name]: '',
    [LANGUAGE.name]: defaultLocaleOption,
  };

  const { t } = useTranslation();

  const { fields, append, remove } = useFieldArray({
    control,
    name: WORK_ABSTRACTS.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    if (defaultLocaleOption) {
      append({ ...fieldsDefaultValues, [LANGUAGE.name]: defaultLocaleOption });
      return;
    }

    append({ ...fieldsDefaultValues, [LANGUAGE.name]: languageOptionsAlt[0] });
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${WORK_ABSTRACTS.name}.${fieldIndex}.${fieldName}`;
  };

  const getAbstractFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, WORK_ABSTRACT.name);
  };

  const getShortAbstractFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, WORK_SHORT_ABSTRACT.name);
  };

  const getLanguageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANGUAGE.name);
  };

  const handleRemove = (index: number) => {
    const item = fields[index];

    if (item && onDelete) {
      onDelete(item.longAbstractId, item.shortAbstractId);
    }

    remove(index);
  };

  const handleAdd = () => {
    if (defaultLocaleOption) {
      append({
        ...fieldsDefaultValues,
        [LANGUAGE.name]: defaultLocaleOption,
        longAbstractId: `${appConfig.defaultId}-${fields.length + 1}`,
        shortAbstractId: `${appConfig.defaultId}-${fields.length + 1}`,
      });
      return;
    }

    append({
      ...fieldsDefaultValues,
      [LANGUAGE.name]: languageOptionsAlt[0],
      longAbstractId: `${appConfig.defaultId}-${fields.length + 1}`,
      shortAbstractId: `${appConfig.defaultId}-${fields.length + 1}`,
    });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <ContentWrapper>
              <FormFieldLabel label={WORK_ABSTRACT.label} id={WORK_ABSTRACT.name} />
              <FormFieldWithControlsWrapper>
                <MarkdownField
                  control={control}
                  name={getAbstractFieldName(index)}
                  id={getAbstractFieldName(index)}
                  className="w-full"
                  disableLineBreaks
                  extendedToolbar
                />
                <DeleteButton onClick={() => handleRemove(index)} disabled={deleteLoading} />
              </FormFieldWithControlsWrapper>
            </ContentWrapper>
            <ContentWrapper>
              <FormFieldLabel label={WORK_SHORT_ABSTRACT.label} id={WORK_SHORT_ABSTRACT.name} />
              <MarkdownField
                control={control}
                name={getShortAbstractFieldName(index)}
                id={getShortAbstractFieldName(index)}
                disableLineBreaks
              />
              <br />
              <LanguageField className="ml-auto" control={control} languageFieldName={getLanguageFieldName(index)} />
            </ContentWrapper>
            {index === fields.length - 1 && (
              <ContentWrapper>
                <br />
                <AddButton type="button" className="mr-auto capitalize" onAdd={handleAdd}>
                  {t('add new translation')}
                </AddButton>
              </ContentWrapper>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};
