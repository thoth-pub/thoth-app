'use client';

import { FORM_FIELDS, subjectTypeOptions } from '@/src/shared/constants/formFields';
import { AutocompleteField, FormFieldWithControlsWrapper, FormFieldWrapper, FormTextField } from '@/src/shared/ui';

import { FormFieldLabel } from '@/src/shared/ui';
import { useForm, useWatch } from 'react-hook-form';
import { SubjectType } from '../../../model/subject.types';
import { Wrapper } from './Wrapper';
import { zodResolver } from '@hookform/resolvers/zod';
import { addSubjectAutocompleteValidationSchema, addSubjectValidationSchema } from '../../../model/subject.validation';
import { appConfig, SubjectTypes } from '@/src/shared';
import { bicFormFields } from '@/src/shared/constants/bicFormFields';
import { bisacFormFields } from '@/src/shared/constants/bisacFormFields';
import { themaFormFields } from '@/src/shared/constants/themaFormFields';
import { Activity, useEffect, useState } from 'react';
import useDebounceValue from '@/src/shared/hooks/useDebouncedValue';

type AddSubjectProps = {
  skipAutoSubmit?: boolean;
  onAdd: (value: { type: SubjectType; code: string }) => void;
};

const { SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

const autocompleteOptions = {
  [SubjectTypes.enum.Bisac]: bisacFormFields,
  [SubjectTypes.enum.Bic]: bicFormFields,
  [SubjectTypes.enum.Thema]: themaFormFields,
  [SubjectTypes.enum.Custom]: [],
  [SubjectTypes.enum.Keyword]: [],
  [SubjectTypes.enum.Lcc]: [],
};

export const AddSubject = (props: AddSubjectProps) => {
  const { onAdd, skipAutoSubmit = false } = props;

  const [optionsLength, setOptionsLength] = useState(0);
  const isAutocomplete = optionsLength > 0;

  const { control, setValue } = useForm({
    resolver: zodResolver(isAutocomplete ? addSubjectAutocompleteValidationSchema : addSubjectValidationSchema),
    defaultValues: {
      [SUBJECT_TYPE.name]: subjectTypeOptions[0].value as SubjectType,
      [SUBJECT_CODE.name]: '',
    },
  });
  const typeField = useWatch({ control, name: SUBJECT_TYPE.name });
  const codeField = useWatch({ control, name: SUBJECT_CODE.name });
  const debouncedValue = useDebounceValue(codeField, isAutocomplete ? 0 : appConfig.fieldsDebounceDelay);

  const options = autocompleteOptions[typeField];

  useEffect(() => {
    setOptionsLength(options.length);

    if (options.length > 0) {
      setValue(SUBJECT_CODE.name, {
        value: '',
        label: '',
      });
      return;
    }

    setValue(SUBJECT_CODE.name, '');
  }, [typeField]);

  useEffect(() => {
    if (skipAutoSubmit) return;

    const isString = typeof debouncedValue === 'string';

    if (
      !debouncedValue ||
      (isString && debouncedValue.length === 0) ||
      (!isString && debouncedValue?.value?.length === 0)
    ) {
      return;
    }

    onAdd({ type: typeField, code: isString ? debouncedValue : debouncedValue?.value });
  }, [debouncedValue]);

  return (
    <Wrapper component="div">
      <FormFieldWrapper>
        <FormFieldLabel label={SUBJECT_TYPE.label} id={SUBJECT_TYPE.name} />
        <FormFieldWithControlsWrapper>
          <FormTextField name={SUBJECT_TYPE.name} control={control} select fullWidth options={subjectTypeOptions} />
        </FormFieldWithControlsWrapper>
      </FormFieldWrapper>

      <FormFieldWrapper>
        <FormFieldLabel label={SUBJECT_CODE.label} id={SUBJECT_CODE.name} />
        <Activity mode={options.length === 0 ? 'visible' : 'hidden'}>
          <FormTextField name={SUBJECT_CODE.name} control={control} />
        </Activity>
        <Activity mode={options.length > 0 ? 'visible' : 'hidden'}>
          <AutocompleteField name={SUBJECT_CODE.name} control={control} options={options} />
        </Activity>
      </FormFieldWrapper>
    </Wrapper>
  );
};
