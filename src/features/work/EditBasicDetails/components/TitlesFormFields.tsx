'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import type { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { appConfig, HELPER_TEXT } from '@/src/shared';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants/formFields';
import {
  AddButton,
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  MarkdownField,
} from '@/src/shared/ui';

import { LanguageField } from './LanguageField';

const { TITLES, WORK_TITLE, SUBTITLE, LANGUAGE } = FORM_FIELDS;
const { WORK_TITLE: WORK_TITLE_HELPER_TEXT, SUBTITLE: SUBTITLE_HELPER_TEXT } = HELPER_TEXT;

type TitlesFormFieldsProps = {
  control: Control<WorkTitlesForm>;
  recommended?: boolean;
  isHelperTextVisible?: boolean;
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const fieldsDefaultValues = {
  titleId: appConfig.defaultId,
  [WORK_TITLE.name]: '',
  [SUBTITLE.name]: '',
  [LANGUAGE.name]: languageOptionsAlt[0],
};

export const TitlesFormFields = (props: TitlesFormFieldsProps) => {
  const { control, recommended, isHelperTextVisible } = props;

  const { t } = useTranslation();

  const { fields, append, remove } = useFieldArray({
    control,
    name: TITLES.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(fieldsDefaultValues);
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${TITLES.name}.${fieldIndex}.${fieldName}`;
  };

  const getTitleFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, WORK_TITLE.name);
  };

  const getSubtitleFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBTITLE.name);
  };

  const getLanguageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANGUAGE.name);
  };

  const handleRemove = (index: number) => {
    remove(index);
  };

  const handleAdd = () => {
    append({ ...fieldsDefaultValues, titleId: `${appConfig.defaultId}-${fields.length + 1}` });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <ContentWrapper>
              <FormFieldLabel label={WORK_TITLE.label} id={WORK_TITLE.name} recommended={recommended} />
              <FormFieldWithControlsWrapper>
                <MarkdownField
                  control={control}
                  name={getTitleFieldName(index)}
                  id={getTitleFieldName(index)}
                  className="w-full"
                  helperText={isHelperTextVisible ? WORK_TITLE_HELPER_TEXT : ''}
                  disableLineBreaks
                />
                <DeleteButton onClick={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </ContentWrapper>
            <ContentWrapper>
              <FormFieldLabel label={SUBTITLE.label} id={SUBTITLE.name} />
              <MarkdownField
                control={control}
                name={getSubtitleFieldName(index)}
                id={getSubtitleFieldName(index)}
                helperText={isHelperTextVisible ? SUBTITLE_HELPER_TEXT : ''}
                disableLineBreaks
              />
            </ContentWrapper>
            <ContentWrapper>
              <br />
              <div className="flex flex-col gap-2">
                <div className="max-w-min">
                  <LanguageField control={control} languageFieldName={getLanguageFieldName(index)} />
                </div>
                {index === fields.length - 1 && (
                  <AddButton type="button" className="mr-auto capitalize" onAdd={handleAdd}>
                    {t('add translation')}
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
