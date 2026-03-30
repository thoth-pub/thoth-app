'use client';

import SearchIcon from '@mui/icons-material/Search';
import { type ChangeEvent, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useContributors } from '@/src/entities/contributor';
import type { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { appConfig } from '@/src/shared/config';
import { getDefaultContribution } from '@/src/shared/constants';
import { useDebouncedValue, useEscapeKey, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  AddButton,
  Button,
  CircularProgress,
  CloseButton,
  InputAdornment,
  Modal,
  ModalWrapper,
  TextField,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

const defaultContribution = getDefaultContribution({ isMain: false });

const AddContributionModal = () => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { contributors, loading } = useContributors({ filter: debouncedValue });
  const { activeEntity: activeContribution, edit } = useContributionStateMachine();
  const [selected, setSelected] = useState<ContributorId | ''>('');
  const [open, setOpen] = useState(false);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.filters });

  useEscapeKey(() => setOpen(false), open);

  const selectedContributorRecord = contributors.find((contributor) => contributor.id === selected);

  const isInitial = contributors.length === 0 && !loading && debouncedValue.length === 0;

  const handleModalState = () => {
    setOpen((prev) => !prev);
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelect = (id: ContributorId) => {
    if (selected !== id) {
      setSelected(id);
      return;
    }

    setSelected('');
  };

  const handleAdd = () => {
    if (!selectedContributorRecord) return;

    const { id, lastName, fullName, orcid, website } = selectedContributorRecord;

    edit({ ...defaultContribution, contributorId: id, lastName, fullName, orcidId: orcid, website });
    handleModalState();
    setSelected('');
    setSearchValue('');
  };

  const handleCreate = () => {
    edit({ ...defaultContribution });
    handleModalState();
  };

  return (
    <>
      <AddButton onAdd={handleModalState} className="mt-3 pr-6 pl-4 capitalize" disabled={!!activeContribution}>
        <TranslatedContent content="actions.addContributor" />
      </AddButton>
      <Modal open={open} onClose={handleModalState}>
        <ModalWrapper onClickAway={handleModalState}>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-(--color-typography) uppercase">
              <TranslatedContent content="actions.addNewContributor" />
            </Typography>
            <CloseButton onClose={handleModalState} />
          </div>
          <TextField
            placeholder={t('searchContributor')}
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
                {isInitial && (
                  <li className="w-full p-2 text-center text-(--color-placeholder)">
                    <Typography variant="body1" component="span">
                      <TranslatedContent content="searchContributor" namespace={NAMESPACES.enum.filters} />
                    </Typography>
                  </li>
                )}
                {contributors.map((contributor) => (
                  <li
                    onClick={() => handleSelect(contributor.id as unknown as ContributorId)}
                    key={contributor.id}
                    className={`w-full cursor-pointer rounded p-2 hover:bg-(--color-hover) ${selected === contributor.id ? 'bg-(--color-list-item-selected)' : ''}`}
                  >
                    <button type="button">
                      <Typography variant="body1" className="flex gap-2" component="span">
                        {contributor.name} {contributor.orcid.length > 0 && `(${contributor.orcid})`}
                      </Typography>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              variant="contained"
              className="capitalize"
              onClick={handleAdd}
              disabled={!selectedContributorRecord}
            >
              <TranslatedContent content="actions.addContributor" />
            </Button>
            <Button variant="text" onClick={handleCreate}>
              <TranslatedContent content="actions.createNew" />
            </Button>
          </div>
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default AddContributionModal;
