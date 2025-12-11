'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateNewWorkEdition, useCreateWorkTranslation } from '@/src/entities/work';
import { WorkCopyForm } from '@/src/entities/work/model/work.types';
import { workCopyValidationSchema } from '@/src/entities/work/model/work.validation';
import { appConfig } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import { AutocompleteField, FormFieldWithControlsWrapper, InputAdornment, SubmitButton } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type CreateWorkCopyProps = {
  isTranslation: boolean;
};

const { WORK_COPY } = FORM_FIELDS;

const CreateWorkCopy = ({ isTranslation }: CreateWorkCopyProps) => {
  const { createWorkTranslation, loading: isCreatingWorkTranslation } = useCreateWorkTranslation();
  const { createNewWorkEdition, loading: isCreatingNewWorkEdition } = useCreateNewWorkEdition();
  const { activePublisher, isAdmin } = usePublisherStateMachine();
  const {
    control,
    formState: { isValid, isDirty },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(workCopyValidationSchema),
  });

  const publishersIds = activePublisher ? [activePublisher] : [];

  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { books, isLoading } = useBooks({ publishersIds, filter: debouncedValue, isAdmin });

  const filteredBooks = books.filter((book) => book.issues.length === 0);

  const options = filteredBooks.map((book) => ({
    label: `${book.title} (edition ${book.edition ?? 1})`,
    value: book.id,
  }));

  const onSubmit = (data: WorkCopyForm) => {
    const {
      workCopy: { value },
    } = data;

    const foundedBook = filteredBooks.find((book) => book.id === value);

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
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--default-gap)]">
        <div className="flex gap-1">
          <FormFieldWithControlsWrapper className="w-full">
            <AutocompleteField
              freeSolo
              disableClearable
              name={WORK_COPY.name}
              control={control}
              options={options}
              onInputChange={(_, value) => setSearchValue(value)}
              loading={isLoading}
              fullWidth
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
