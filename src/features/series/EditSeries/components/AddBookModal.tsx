'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import removeMd from 'remove-markdown';

import { useBooks } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useCreateIssue } from '@/src/entities/series';
import type { IssueValidationSchema, SeriesEntity } from '@/src/entities/series/model/series.types';
import { issueValidationSchema } from '@/src/entities/series/model/series.validation';
import { appConfig, getMainTitle } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  AutocompleteField,
  Button,
  CloseButton,
  FormTextField,
  InputAdornment,
  Modal,
  ModalWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

const { WORK_SERIES, ISSUE_ORDINAL } = FORM_FIELDS;

type AddBookModalProps = {
  series: SeriesEntity;
};

export const AddBookModal = (props: AddBookModalProps) => {
  const { series } = props;

  const [open, setOpen] = useState(false);

  const lastIssueOrdinal = series.issues.sort((a, b) => a.ordinal - b.ordinal).at(-1)?.ordinal ?? 1;

  const { activePublisher } = usePublisherStateMachine();
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

  const publishersIds = activePublisher ? [activePublisher.id] : [];

  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { books, isLoading } = useBooks({ publishersIds, filter: debouncedValue });
  const { createIssue } = useCreateIssue();

  const filteredBooks = books.filter((book) => book.issues.length === 0);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.forms });

  const options = filteredBooks.map((book) => ({
    label: removeMd(getMainTitle(book.titles).title),
    value: book.id,
  }));

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
              <div className="flex gap-1">
                <AutocompleteField
                  freeSolo
                  disableClearable
                  name={WORK_SERIES.name}
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
                <FormTextField
                  control={control}
                  name={ISSUE_ORDINAL.name}
                  label={t(ISSUE_ORDINAL.label)}
                  placeholder={t(ISSUE_ORDINAL.placeholder)}
                  type={ISSUE_ORDINAL.type}
                  min={1}
                  step="1"
                />
              </div>

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
