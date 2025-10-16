import { Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, subjectTypeOptions } from '@/src/shared/constants/formFields';
import {
  AddButton,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
} from '@/src/shared/ui';
import { isDefaultId } from '@/src/shared/utils';

import type { SubjectId, SubjectsFormType, SubjectType } from '../../../model/subject.types';

type FormFieldsProps = {
  control: Control<SubjectsFormType>;
  onDelete?: (id: SubjectId) => void;
  onClose?: () => void;
};

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const { control, onDelete, onClose } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: SUBJECTS.name,
  });

  const { t } = useTranslation();

  const fieldsDefaultValues = {
    subjectId: appConfig.defaultId,
    [SUBJECT_TYPE.name]: subjectTypeOptions[0].value as SubjectType,
    [SUBJECT_CODE.name]: '',
  };

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(fieldsDefaultValues);
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${SUBJECTS.name}.${fieldIndex}.${fieldName}`;
  };

  const getSubjectTypeFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBJECT_TYPE.name);
  };

  const getSubjectCodeFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, SUBJECT_CODE.name);
  };

  const handleRemove = (index: number) => {
    const item = fields[index];

    if (item && item.subjectId && onDelete && !isDefaultId(item.subjectId)) {
      onDelete?.(item.subjectId);
      console.log(item);
    }

    remove(index);

    if (fields.length === 1) {
      onClose?.();
    }
  };

  const handleAdd = () => {
    append({ ...fieldsDefaultValues, subjectId: `${appConfig.defaultId}-${fields.length + 1}` });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <FormFieldWrapper>
              <FormFieldLabel label={SUBJECT_TYPE.label} id={SUBJECT_TYPE.name} />
              <FormFieldWithControlsWrapper>
                <FormTextField
                  name={getSubjectTypeFieldName(index)}
                  control={control}
                  id={getSubjectTypeFieldName(index)}
                  select
                  fullWidth
                  options={subjectTypeOptions}
                />
                <DeleteButton onClick={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>

            <FormFieldWrapper>
              <FormFieldLabel label={SUBJECT_CODE.label} id={SUBJECT_CODE.name} />
              <FormTextField
                name={getSubjectCodeFieldName(index)}
                control={control}
                id={getSubjectCodeFieldName(index)}
              />
            </FormFieldWrapper>
          </li>
        ))}
      </ul>

      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {SUBJECTS.label}
        </InputLabel>
        <AddButton type="button" className="mt-[2rem] mr-auto capitalize" onAdd={handleAdd}>
          {t('add new subject')}
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
