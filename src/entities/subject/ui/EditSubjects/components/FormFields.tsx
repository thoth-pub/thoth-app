import { useState } from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SubjectTypes } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { bicFormFields } from '@/src/shared/constants/bicFormFields';
import { bisacFormFields } from '@/src/shared/constants/bisacFormFields';
import { FORM_FIELDS, subjectTypeOptions } from '@/src/shared/constants/formFields';
import { themaFormFields } from '@/src/shared/constants/themaFormFields';
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
import { isDefaultId } from '@/src/shared/utils';
import { BIC_CODES } from '@/src/shared/utils/subjects/bic-codes';
import { BISAC_CODES } from '@/src/shared/utils/subjects/bisac-codes';
import { THEMA_CODES } from '@/src/shared/utils/subjects/thema-codes';

import type { SubjectId, SubjectsFormType, SubjectType } from '../../../model/subject.types';
import { AddSubject } from './AddSubject';
import { NewSubjectModal } from './NewSubjectModal';
import { Wrapper } from './Wrapper';

type FormFieldsProps = {
  control: Control<SubjectsFormType>;
  recommended?: boolean;
  onDelete?: (id: SubjectId) => void;
  onClose?: () => void;
};

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE, SUBJECT_CODE_ALT } = FORM_FIELDS;

const fieldsDefaultValues = {
  subjectId: appConfig.defaultId,
  [SUBJECT_TYPE.name]: subjectTypeOptions[0].value as SubjectType,
  [SUBJECT_CODE.name]: {
    value: '',
    label: '',
  },
  [SUBJECT_CODE_ALT.name]: '',
};

const fieldsOptions = {
  [SubjectTypes.enum.Bic]: bicFormFields,
  [SubjectTypes.enum.Bisac]: bisacFormFields,
  [SubjectTypes.enum.Thema]: themaFormFields,
  [SubjectTypes.enum.Custom]: [],
  [SubjectTypes.enum.Keyword]: [],
  [SubjectTypes.enum.Lcc]: [],
};

const codes = {
  [SubjectTypes.enum.Bic]: BIC_CODES,
  [SubjectTypes.enum.Bisac]: BISAC_CODES,
  [SubjectTypes.enum.Thema]: THEMA_CODES,
  [SubjectTypes.enum.Custom]: [],
  [SubjectTypes.enum.Keyword]: [],
  [SubjectTypes.enum.Lcc]: [],
};

export const FormFields = (props: FormFieldsProps) => {
  const { control, recommended, onDelete, onClose } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: SUBJECTS.name,
  });

  const { t } = useTranslation();

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${SUBJECTS.name}.${fieldIndex}.${fieldName}`;
  };

  const getSubjectTypeFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBJECT_TYPE.name);
  };

  const getSubjectCodeFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBJECT_CODE.name);
  };

  const getSubjectCodeAltFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBJECT_CODE_ALT.name);
  };

  const handleRemove = (index: number) => {
    const item = fields[index];

    if (item && item.subjectId && onDelete && !isDefaultId(item.subjectId)) {
      onDelete?.(item.subjectId);
    }

    remove(index);

    if (fields.length === 1) {
      onClose?.();
    }
  };

  const handleModalState = () => {
    setIsModalOpen((prev) => !prev);
  };

  const handleAdd = () => {
    handleModalState();
  };

  const handleAddNewSubject = (value: { type: SubjectType; code: string }) => {
    append({
      ...fieldsDefaultValues,
      [SUBJECT_TYPE.name]: value.type,
      [SUBJECT_CODE.name]: { value: value.code, label: value.code },
      [SUBJECT_CODE_ALT.name]: value.code,
      subjectId: `${appConfig.defaultId}-${fields.length + 1}`,
    });
    handleModalState();
  };

  const handleAddFirstSubject = (value: { type: SubjectType; code: string }) => {
    const category = codes[value.type as keyof typeof codes];

    const label = `${category[value.code as keyof typeof category]} (${value.code})`;

    const newSubject = {
      ...fieldsDefaultValues,
      [SUBJECT_TYPE.name]: value.type,
      [SUBJECT_CODE.name]: { value: value.code, label },
      [SUBJECT_CODE_ALT.name]: value.code,
    };

    replace(newSubject);
  };

  if (fields.length === 0) {
    return <AddSubject onAdd={handleAddFirstSubject} />;
  }

  const bicField = fields.find((field) => field[SUBJECT_TYPE.name] === SubjectTypes.enum.Bic);
  const bisacField = fields.find((field) => field[SUBJECT_TYPE.name] === SubjectTypes.enum.Bisac);
  const customField = fields.find((field) => field[SUBJECT_TYPE.name] === SubjectTypes.enum.Custom);
  const keywordField = fields.find((field) => field[SUBJECT_TYPE.name] === SubjectTypes.enum.Keyword);
  const lccField = fields.find((field) => field[SUBJECT_TYPE.name] === SubjectTypes.enum.Lcc);
  const themaField = fields.find((field) => field[SUBJECT_TYPE.name] === SubjectTypes.enum.Thema);

  const fieldsIds = [bicField?.id, bisacField?.id, customField?.id, keywordField?.id, lccField?.id, themaField?.id];

  return (
    <>
      <Wrapper component="ul">
        {fields.map((field, index) => (
          <Wrapper component="li" key={field.id}>
            <FormFieldWrapper className={fieldsIds.includes(field.id) ? '' : 'hidden'}>
              <FormFieldLabel label={SUBJECT_TYPE.label} id={SUBJECT_TYPE.name} recommended={recommended} />
              <FormTextField
                name={getSubjectTypeFieldName(index)}
                control={control}
                id={getSubjectTypeFieldName(index)}
                fullWidth
                disabled
              />
            </FormFieldWrapper>

            <FormFieldWrapper>
              <FormFieldLabel
                label={SUBJECT_CODE.label}
                id={SUBJECT_CODE.name}
                className={fieldsIds.includes(field.id) ? '' : 'opacity-0'}
              />
              <FormFieldWithControlsWrapper>
                {fieldsOptions[field[SUBJECT_TYPE.name]]?.length > 0 ? (
                  <AutocompleteField
                    name={getSubjectCodeFieldName(index)}
                    control={control}
                    freeSolo={fieldsOptions[field[SUBJECT_TYPE.name]]?.length === 0}
                    id={getSubjectCodeFieldName(index)}
                    options={fieldsOptions[field[SUBJECT_TYPE.name]]}
                    fullWidth
                  />
                ) : (
                  <FormTextField
                    name={getSubjectCodeAltFieldName(index)}
                    control={control}
                    id={getSubjectCodeAltFieldName(index)}
                    fullWidth
                  />
                )}
                <DeleteButton onClick={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>
          </Wrapper>
        ))}
      </Wrapper>

      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {SUBJECTS.label}
        </InputLabel>
        <AddButton type="button" className="mt-[2rem] mr-auto capitalize" onAdd={handleAdd}>
          {t('add new subject')}
        </AddButton>
      </FormFieldWrapper>
      <NewSubjectModal open={isModalOpen} onClose={handleModalState} onAdd={handleAddNewSubject} />
    </>
  );
};
