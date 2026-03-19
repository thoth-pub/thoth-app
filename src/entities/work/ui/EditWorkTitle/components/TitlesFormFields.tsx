'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { LocaleCode } from '@/gql/graphql';
import type { WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, languageOptionsAlt } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TitleId } from '@/src/shared/types';
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
import { isDefaultId } from '@/src/shared/utils';

const { TITLES, WORK_TITLE, SUBTITLE, LANGUAGE } = FORM_FIELDS;

type TitlesFormFieldsProps = {
  control: Control<WorkTitlesForm>;
  recommended?: boolean;
  defaultLocaleOption?: { value: LocaleCode; label: string };
  onDelete?: (titleId: TitleId) => void;
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

const fieldsDefaultValues = {
  titleId: appConfig.defaultId,
  [WORK_TITLE.name]: '',
  [SUBTITLE.name]: '',
  [LANGUAGE.name]: languageOptionsAlt[0],
};

export const TitlesFormFields = (props: TitlesFormFieldsProps) => {
  const { control, recommended, defaultLocaleOption, onDelete } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: TITLES.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    if (defaultLocaleOption) {
      append({
        ...fieldsDefaultValues,
        [LANGUAGE.name]: defaultLocaleOption,
      });
      return;
    }

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
    if (index === 0) return;

    const item = fields[index];

    if (!item) return;

    if (item.titleId && onDelete && !isDefaultId(item.titleId)) {
      onDelete?.(item.titleId);
    }

    remove(index);
  };

  const handleAdd = () => {
    const id = `${appConfig.defaultId}-${fields.length + 1}`;

    if (defaultLocaleOption) {
      append({
        ...fieldsDefaultValues,
        [LANGUAGE.name]: defaultLocaleOption,
        titleId: id,
      });
      return;
    }

    append({
      ...fieldsDefaultValues,
      titleId: id,
    });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <ContentWrapper>
              <FormFieldLabel
                label={WORK_TITLE.label}
                id={WORK_TITLE.name}
                recommended={recommended}
                namespace={NAMESPACES.enum.common}
              />
              <FormFieldWithControlsWrapper>
                <MarkdownField
                  control={control}
                  name={getTitleFieldName(index)}
                  id={getTitleFieldName(index)}
                  className="w-full"
                  disableLineBreaks
                />
                {index > 0 && <DeleteButton onClick={() => handleRemove(index)} />}
              </FormFieldWithControlsWrapper>
            </ContentWrapper>
            <ContentWrapper>
              <FormFieldLabel label={SUBTITLE.label} id={SUBTITLE.name} />
              <MarkdownField
                control={control}
                name={getSubtitleFieldName(index)}
                id={getSubtitleFieldName(index)}
                disableLineBreaks
              />
              <br />
              <LanguageField className="ml-auto" control={control} languageFieldName={getLanguageFieldName(index)} />
            </ContentWrapper>
            {index === fields.length - 1 && (
              <ContentWrapper>
                <br />
                <AddButton type="button" className="mr-auto px-0 capitalize" onAdd={handleAdd}>
                  <TranslatedContent content="actions.addNewTranslation" />
                </AddButton>
              </ContentWrapper>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};
