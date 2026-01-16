'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import removeMd from 'remove-markdown';

import { useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { SetId, SetWorkFormType, useAddToSet } from '@/src/entities/sets';
import { setWorkValidationSchema } from '@/src/entities/sets/model/set.validation';
import { appConfig, getMainTitle } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import { AutocompleteField, Button, CloseButton, InputAdornment, ModalWrapper, Typography } from '@/src/shared/ui';
import { Modal } from '@/src/shared/ui';

const { SET_WORK } = FORM_FIELDS;

export const AddBookModal = ({ setId, totalBooks }: { setId: SetId; totalBooks: number }) => {
  const [open, setOpen] = useState(false);

  const { addToSet } = useAddToSet(setId);

  const { activePublisher, isAdmin } = usePublisherStateMachine();
  const {
    control,
    formState: { isValid, isDirty },
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(setWorkValidationSchema),
  });

  const publishersIds = activePublisher ? [activePublisher] : [];

  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { books, isLoading } = useBooks({ publishersIds, filter: debouncedValue, isAdmin });

  const filteredBooks = books.filter((book) => book.issues.length === 0);

  const options = filteredBooks.map((book) => ({
    label: removeMd(getMainTitle(book.titles).title),
    value: book.id,
  }));

  useEffect(() => {
    if (debouncedValue.length > 0) return;

    reset();
  }, [debouncedValue.length]);

  const onSubmit = (data: SetWorkFormType) => {
    addToSet({ setId, bookId: data.work.value, ordinal: totalBooks + 1 });
    setOpen(false);
  };

  return (
    <>
      <Button startIcon={<AddIcon />} className="max-w-fit" onClick={() => setOpen(true)}>
        Add Book
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalWrapper>
          <div className="flex flex-col justify-between gap-[var(--default-gap)]">
            <div className="flex justify-between">
              <Typography variant="h2" component="h3" className="text-[var(--color-typography)] capitalize">
                Add Book
              </Typography>
              <CloseButton onClose={() => setOpen(false)} />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--default-gap)]">
              <AutocompleteField
                freeSolo
                disableClearable
                name={SET_WORK.name}
                control={control}
                options={options}
                onInputChange={(_, value) => setSearchValue(value)}
                loading={isLoading}
                icon={
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                }
              />

              <Button startIcon={<AddIcon />} className="max-w-fit" disabled={!isValid || !isDirty} type="submit">
                Add Book
              </Button>
            </form>
          </div>
        </ModalWrapper>
      </Modal>
    </>
  );
};
