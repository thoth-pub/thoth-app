'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { appConfig } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, FormFieldWrapper, InputLabel, TranslatedContent } from '@/src/shared/ui';

import type { AffiliationsForm } from '../../model/affiliation.types';
import { FormField } from './FormField';

type FormFieldsProps = {
  control: Control<AffiliationsForm>;
  isHelperTextVisible?: boolean;
  onDelete?: (id: string) => void;
};

const { AFFILIATIONS, AFFILIATION, POSITION } = FORM_FIELDS;

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const fieldsDefaultValues = {
  id: appConfig.defaultId,
  affiliationId: appConfig.defaultId,
  [AFFILIATION.name]: { value: '', label: '' },
  [POSITION.name]: '',
};

export const FormFields = (props: FormFieldsProps) => {
  const { isHelperTextVisible = false, control, onDelete } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: AFFILIATIONS.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(fieldsDefaultValues);
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${AFFILIATIONS.name}.${fieldIndex}.${fieldName}`;
  };

  const getAffiliationFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, AFFILIATION.name);
  };

  const getPositionFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, POSITION.name);
  };

  const handleRemove = (index: number) => {
    if (onDelete) {
      onDelete(fields[index]?.affiliationId ?? '');
    }

    remove(index);
  };

  const handleAdd = () => {
    append({ ...fieldsDefaultValues, id: `${appConfig.defaultId}-${fields.length + 1}` });
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <FormField
              control={control}
              affiliationFieldName={getAffiliationFieldName(index)}
              positionFieldName={getPositionFieldName(index)}
              onRemove={() => handleRemove(index)}
              isHelperTextVisible={isHelperTextVisible}
            />
          </li>
        ))}
      </ul>
      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {AFFILIATIONS.label}
        </InputLabel>
        <AddButton type="button" className="mt-4 mr-auto pl-0 capitalize xl:mt-8" onAdd={handleAdd}>
          <TranslatedContent content="actions.addNewAffiliation" />
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
