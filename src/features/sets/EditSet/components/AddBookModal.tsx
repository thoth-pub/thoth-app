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
import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS } from '@/src/shared/constants';
import { useDebouncedValue, useEscapeKey } from '@/src/shared/hooks';
import {
  AutocompleteField,
  Button,
  CloseButton,
  InputAdornment,
  Modal,
  ModalWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { getMainTitle } from '@/src/shared/utils';

const { SET_WORK } = FORM_FIELDS;

export const AddBookModal = ({ setId, totalBooks }: { setId: SetId; totalBooks: number }) => {
  const [open, setOpen] = useState(false);

  useEscapeKey(() => setOpen(false), open);

  const { addToSet } = useAddToSet(setId);

  const { activePublisher } = usePublisherStateMachine();
  const {
    control,
    formState: { isValid, isDirty },
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(setWorkValidationSchema),
  });

  const publishersIds = activePublisher ? [activePublisher.id] : [];

  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { books, isLoading } = useBooks({ publishersIds, filter: debouncedValue });

  const disabledBookIds = new Set(books.filter((book) => book.issues.length > 0).map((book) => book.id));

  const options = books
    .map((book) => ({
      label: removeMd(getMainTitle(book.titles).fullTitle),
      value: book.id,
    }))
    .sort((a, b) => Number(disabledBookIds.has(a.value)) - Number(disabledBookIds.has(b.value)));

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
      <Button startIcon={<AddIcon />} className="max-w-fit capitalize" onClick={() => setOpen(true)}>
        <TranslatedContent content="actions.addBook" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalWrapper>
          <div className="flex flex-col justify-between gap-(--default-gap)">
            <div className="flex justify-between">
              <Typography variant="h2" component="h3" className="text-(--color-typography) uppercase">
                <TranslatedContent content="actions.addBook" />
              </Typography>
              <CloseButton onClose={() => setOpen(false)} />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-(--default-gap)">
              <AutocompleteField
                freeSolo
                disableClearable
                name={SET_WORK.name}
                control={control}
                options={options}
                getOptionDisabled={(option) => disabledBookIds.has(option.value)}
                onInputChange={(_, value) => setSearchValue(value)}
                loading={isLoading}
                icon={
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                }
              />

              <Button
                startIcon={<AddIcon />}
                className="max-w-fit capitalize"
                disabled={!isValid || !isDirty}
                type="submit"
              >
                <TranslatedContent content="actions.addBook" />
              </Button>
            </form>
          </div>
        </ModalWrapper>
      </Modal>
    </>
  );
};
