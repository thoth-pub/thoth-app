'use client';

import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { FORM_FIELDS, languageOptions } from '@/src/shared/constants/formFields';
import {
  FormControlGroup,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  InputLabel,
  MarkdownField,
  MarkdownSwitch,
  TextField,
  Typography,
} from '@/src/shared/ui';
import AddButton from '@/src/shared/ui/core/AddButton/AddButton';

const { TITLE, SUBTITLE } = FORM_FIELDS;

// TODO: refactoring after complete
const EditWorkTitlesForm = () => {
  const [isMarkdownSelected, setIsMarkdownSelected] = useState(true);
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<{ titles: { title: string; subtitle: string; language: string }[] }>({
    defaultValues: { titles: [{ title: '', subtitle: '', language: '' }] },
  });
  const { fields, append } = useFieldArray({
    control,
    name: 'titles', // unique name for your Field Array
  });

  const onSubmit = handleSubmit((data) => {
    console.log(data);
  });

  const onMarkdownSwitch = () => {
    setIsMarkdownSelected((prev) => !prev);
  };

  return (
    <form className="flex flex-col gap-[var(--default-gap)]" onSubmit={onSubmit}>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-[var(--default-gap)]">
          <FormFieldWrapper>
            <InputLabel>{TITLE.label}</InputLabel>
            <div className="ml-[1.25rem]">
              {index === 0 ? (
                <FormFieldWithControlsWrapper>
                  <MarkdownField name={`titles.${index}.title`} control={control} />
                  <FormControlGroup isDisabled={!isValid} />
                </FormFieldWithControlsWrapper>
              ) : (
                <MarkdownField name={`titles.${index}.title`} control={control} />
              )}
            </div>
          </FormFieldWrapper>

          <FormFieldWrapper>
            <InputLabel>{SUBTITLE.label}</InputLabel>
            <div className="ml-[1.25rem] flex flex-col gap-[var(--default-gap)]">
              <MarkdownField name={`titles.${index}.subtitle`} control={control}>
                {index === 0 && <MarkdownSwitch defaultChecked={isMarkdownSelected} onChange={onMarkdownSwitch} />}
              </MarkdownField>
              <div className="flex justify-between">
                <div className="ml-2 flex">
                  <Typography color="primary" className="mt-auto mr-1 font-semibold">
                    Language
                  </Typography>
                  <TextField
                    control={control}
                    name={`titles.${index}.language`}
                    select
                    options={languageOptions}
                    variant="standard"
                    className="min-w-[5.3rem]"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '1.5rem',
                        padding: 0,
                        backgroundColor: 'transparent',
                        '& .MuiSelect-select': {
                          height: '1.5rem',
                          padding: 0,
                          color: 'var(--purple)',
                        },
                      },
                    }}
                  />
                </div>
                {fields.length > 1 && 'Select main'}
              </div>
            </div>
          </FormFieldWrapper>
        </div>
      ))}

      <AddButton className="ml-[11.25rem] self-start" onAdd={() => append({ title: '', subtitle: '', language: '' })}>
        Add Translation
      </AddButton>
    </form>
  );
};

export default EditWorkTitlesForm;
