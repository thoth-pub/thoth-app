'use client';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Activity, ChangeEvent, useState } from 'react';

import { MarkupFormat } from '@/gql/graphql';
import { EditSetTitle, SetEntity, SetId, SetTitleFormType, useAddToSet, useCreateSet } from '@/src/entities/sets';
import useSets from '@/src/entities/sets/api/hooks/useSets';
import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig, getMainTitle, LocaleCodeType, WorkStatuses, WorkTypes } from '@/src/shared';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  Button,
  ButtonGroup,
  CircularProgress,
  CloseButton,
  InputAdornment,
  Modal,
  ModalWrapper,
  SubmitButton,
  TextField,
  Typography,
} from '@/src/shared/ui';

type AddVolumeProps = {
  workId: WorkId;
  open: boolean;
  onClose: () => void;
};

const STEPS = {
  EXISTING: 'existing',
  NEW: 'new',
} as const;

export const AddVolume = (props: AddVolumeProps) => {
  const { workId, open, onClose } = props;

  const { work } = useWork(workId);

  const defaultSet: SetEntity = {
    id: appConfig.defaultId,
    titles: [],
    type: WorkTypes.enum.BookSet,
    updatedAt: '',
    imprintId: work?.imprintId ?? '',
    status: WorkStatuses.enum.Forthcoming,
    edition: 1,
    volumesCount: 0,
  };

  const { createSet } = useCreateSet();
  const { addToSet } = useAddToSet();

  const [selected, setSelected] = useState<(typeof STEPS)[keyof typeof STEPS]>(STEPS.EXISTING);
  const [set, setSet] = useState(defaultSet);
  const [markupFormat, setMarkupFormat] = useState<MarkupFormat.JatsXml | MarkupFormat.PlainText>(
    MarkdownFormats.enum.JATS_XML,
  );
  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { sets, loading } = useSets({ filter: debouncedValue });
  const [selectedSet, setSelectedSet] = useState<SetId | ''>('');

  const isNewStep = selected === STEPS.NEW;
  const isExistingStep = selected === STEPS.EXISTING;

  const updateTitles = (data: SetTitleFormType) => {
    const { titles, markdownFormat } = data;

    const markupFormat = markdownFormat ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;

    setSet({
      ...set,
      titles: titles.map(({ titleId, workTitle, subtitle = '', language }, index) => ({
        id: titleId,
        title: workTitle,
        subtitle,
        localeCode: language.value as LocaleCodeType,
        canonical: index === 0,
        fullTitle: `${workTitle} ${subtitle}`,
      })),
    });
    setMarkupFormat(markupFormat);
  };

  const deleteTitle = (titleId: string) => {
    if (!set) return;

    setSet({ ...set, titles: set.titles.filter((title) => title.id !== titleId) });
  };

  const createNewSet = async () => {
    const createdSet = await createSet({ data: { ...set, imprintId: work?.imprintId ?? '' }, markupFormat });
    await addToSet({ setId: createdSet.id, bookId: workId, ordinal: 1 });
    setSelected(STEPS.EXISTING);
    onClose();
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelect = (id: SetId) => {
    if (selected !== id) {
      setSelectedSet(id);
      return;
    }

    setSelectedSet('');
  };

  const addToExistingSet = async () => {
    const set = sets.find((set) => set.id === selectedSet);

    if (!set) return;

    await addToSet({ setId: set.id, bookId: workId, ordinal: set.volumesCount + 1 });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalWrapper>
        <div className="flex justify-between">
          <Typography variant="h2" component="h3" className="text-(--color-typography)">
            {isNewStep ? 'Add New Set' : 'Add Volume'}
          </Typography>
          <ButtonGroup className="gap-2">
            <Activity mode={isNewStep ? 'visible' : 'hidden'}>
              <SubmitButton onClick={createNewSet} disabled={set.titles.length === 0} />
            </Activity>
            <Activity mode={isExistingStep ? 'visible' : 'hidden'}>
              <SubmitButton onClick={addToExistingSet} disabled={!selectedSet} />
            </Activity>
            <CloseButton onClose={onClose} />
          </ButtonGroup>
        </div>

        <Activity mode={isNewStep ? 'visible' : 'hidden'}>
          <EditSetTitle set={set} onSubmit={updateTitles} onDelete={deleteTitle} />
        </Activity>
        <Activity mode={isExistingStep ? 'visible' : 'hidden'}>
          <TextField
            placeholder="Search set"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
              },
            }}
            value={searchValue}
            onChange={handleSearch}
          />
          <div className="flex min-h-40">
            {loading ? (
              <CircularProgress className="m-auto" />
            ) : (
              <ul className="flex w-full flex-col overflow-y-scroll">
                {searchValue.length === 0 && (
                  <li className="w-full p-2 text-center text-[var(--color-placeholder)]">
                    <Typography variant="body1" component="span">
                      Type to search for set
                    </Typography>
                  </li>
                )}
                {searchValue.length > 0 &&
                  sets.map((set) => (
                    <li
                      onClick={() => handleSelect(set.id)}
                      key={set.id}
                      className={`w-full cursor-pointer rounded p-2 hover:bg-[var(--color-hover)] ${selectedSet === set.id ? 'bg-[var(--color-list-item-selected)]' : ''}`}
                    >
                      <button type="button">
                        <Typography variant="body1" component="span">
                          {getMainTitle(set.titles).title}
                        </Typography>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </Activity>
        <div className="flex gap-2">
          <Button
            disabled={isNewStep}
            className="capitalize"
            onClick={() => setSelected(STEPS.NEW)}
            startIcon={<AddIcon />}
          >
            add new set
          </Button>
          <Button disabled={isExistingStep} className="capitalize" onClick={() => setSelected(STEPS.EXISTING)}>
            select
          </Button>
        </div>
      </ModalWrapper>
    </Modal>
  );
};
