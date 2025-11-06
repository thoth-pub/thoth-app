'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateIssue } from '@/src/entities/series';
import type { IssueValidationSchema, SeriesEntity } from '@/src/entities/series/model/series.types';
import { issueValidationSchema } from '@/src/entities/series/model/series.validation';
import { appConfig, convertEntityToSelectFieldOptions, QueryToken } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AutocompleteField,
  Button,
  CloseButton,
  FormTextField,
  InputAdornment,
  ModalWrapper,
  Typography,
} from '@/src/shared/ui';
import { Modal } from '@/src/shared/ui';

const { WORK_SERIES, ISSUE_ORDINAL } = FORM_FIELDS;

type AddBookModalProps = {
  queryToken: QueryToken;
  series: SeriesEntity;
};

export const AddBookModal = (props: AddBookModalProps) => {
  const { queryToken, series } = props;

  const [open, setOpen] = useState(false);

  const lastIssueOrdinal = series.issues.sort((a, b) => a.ordinal - b.ordinal).at(-1)?.ordinal ?? 1;

  const { activePublisher, isAdmin } = usePublisherStateMachine();
  const {
    control,
    formState: { isValid, isDirty },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      [ISSUE_ORDINAL.name]: lastIssueOrdinal ? `${lastIssueOrdinal + 1}` : '1',
    },
    resolver: zodResolver(issueValidationSchema),
  });

  const publishersIds = activePublisher ? [activePublisher] : [];

  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { books, loading } = useBooks({ publishersIds, filter: debouncedValue, isAdmin });
  const { createIssue } = useCreateIssue({ queryToken });

  const filteredBooks = books.filter((book) => book.issues.length === 0);

  const options = convertEntityToSelectFieldOptions(filteredBooks, 'title');

  useEffect(() => {
    if (debouncedValue.length > 0) return;

    reset();
  }, [debouncedValue.length]);

  const onSubmit = (data: IssueValidationSchema) => {
    createIssue({
      orderNumber: data.ordinal,
      seriesId: series.id,
      workId: data.series.value,
    });
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
              <div className="flex gap-1">
                <AutocompleteField
                  freeSolo
                  disableClearable
                  name={WORK_SERIES.name}
                  control={control}
                  options={options}
                  onInputChange={(_, value) => setSearchValue(value)}
                  loading={loading}
                  icon={
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  }
                />
                <FormTextField
                  control={control}
                  name={ISSUE_ORDINAL.name}
                  label={ISSUE_ORDINAL.label}
                  placeholder={ISSUE_ORDINAL.placeholder}
                  type={ISSUE_ORDINAL.type}
                  min={1}
                  step="1"
                />
              </div>

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
