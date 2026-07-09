/* eslint-disable react-hooks/refs */
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateNewWorkEdition, useCreateWorkTranslation } from '@/src/entities/work';
import { WorkCopyForm, WorkEntity } from '@/src/entities/work/model/work.types';
import { workCopyValidationSchema } from '@/src/entities/work/model/work.validation';
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AutocompleteField,
  ContentSection,
  FormFieldWithControlsWrapper,
  InputAdornment,
  SubmitButton,
} from '@/src/shared/ui';
import { getMainTitle } from '@/src/shared/utils';

type CreateWorkCopyProps = {
  isTranslation: boolean;
};

const { WORK_COPY } = FORM_FIELDS;

const CreateWorkCopy = ({ isTranslation }: CreateWorkCopyProps) => {
  const { createWorkTranslation, loading: isCreatingWorkTranslation } = useCreateWorkTranslation();
  const { createNewWorkEdition, loading: isCreatingNewWorkEdition } = useCreateNewWorkEdition();
  const { activePublisher } = usePublisherStateMachine();
  const {
    control,
    formState: { isValid, isDirty },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(workCopyValidationSchema),
  });

  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { books, isLoading } = useBooks({
    publishersIds,
    filter: debouncedValue,
  });

  const latestBooks = useRef<WorkEntity[]>([]);

  useEffect(() => {
    if (books.length > 0) latestBooks.current = books;
  }, [books]);

  const filteredBooks = books.filter((book) => book.issues.length === 0);

  const options = filteredBooks.map((book) => ({
    label: `${getMainTitle(book.titles).title} (edition ${book.edition ?? 1})`,
    value: book.id,
  }));

  const onSubmit = (data: WorkCopyForm) => {
    const {
      workCopy: { value },
    } = data;

    const foundedBook = latestBooks.current.find((book) => book.id === value);

    if (!foundedBook) return;

    if (isTranslation) {
      createWorkTranslation(foundedBook);
      return;
    }

    createNewWorkEdition(foundedBook);
  };

  const isSubmitting = isCreatingWorkTranslation || isCreatingNewWorkEdition;

  return (
    <ContentSection>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-(--default-gap)">
        <div className="flex gap-1">
          <FormFieldWithControlsWrapper className="w-full">
            <AutocompleteField
              disableClearable
              name={WORK_COPY.name}
              control={control}
              options={options}
              onInputChange={(_, value) => setSearchValue(value)}
              loading={isLoading}
              fullWidth
              renderOption={({ key: _key, ...optionProps }, option) => (
                <li key={option.value} {...optionProps}>
                  <span>{option.label}</span>
                </li>
              )}
              icon={
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              }
            />
            <SubmitButton type="submit" disabled={!isValid || !isDirty || isSubmitting} />
          </FormFieldWithControlsWrapper>
        </div>
      </form>
    </ContentSection>
  );
};

export default CreateWorkCopy;
