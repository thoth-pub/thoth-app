'use client';

import SearchIcon from '@mui/icons-material/Search';
import { type ChangeEvent, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useContributors } from '@/src/entities/contributor';
import type { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { appConfig } from '@/src/shared/config';
import { ContributorTypes } from '@/src/shared/constants';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AddButton,
  Button,
  CircullarProgress,
  CloseButton,
  InputAdornment,
  Modal,
  ModalWrapper,
  TextField,
  Typography,
} from '@/src/shared/ui';

const defautlId = appConfig.defaultId;

const defaultContribution = {
  id: defautlId,
  type: ContributorTypes.enum.Author,
  isMain: false,
  orderNumber: 0,
  biography: '',
  orcidId: '',
  website: '',
  firstName: '',
  affiliations: [],
  fullName: 'Full Name',
  lastName: 'Last Name',
  contributorId: defautlId,
};

const AddContributionModal = () => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { contributors, loading } = useContributors({ filter: debouncedValue });
  const { activeContribution, edit } = useContributionStateMachine();
  const [selected, setSelected] = useState<ContributorId | ''>('');
  const [open, setOpen] = useState(false);

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
      <AddButton onAdd={handleModalState} className="mt-3 self-end" disabled={!!activeContribution}>
        Add Contributor
      </AddButton>
      <Modal open={open} onClose={handleModalState}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-[var(--color-typography)]">
              Add contributor
            </Typography>
            <CloseButton onClose={handleModalState} />
          </div>
          <TextField
            placeholder="Search contributor"
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
              <CircullarProgress className="m-auto" />
            ) : (
              <ul className="flex w-full flex-col overflow-y-scroll">
                {isInitial && (
                  <li className="w-full p-2 text-center text-[var(--color-placeholder)]">
                    <Typography variant="body1" component="span">
                      Type to search for a contributor
                    </Typography>
                  </li>
                )}
                {contributors.map((contributor) => (
                  <li
                    onClick={() => handleSelect(contributor.id as unknown as ContributorId)}
                    key={contributor.id}
                    className={`w-full cursor-pointer rounded p-2 hover:bg-[var(--color-hover)] ${selected === contributor.id ? 'bg-[var(--color-list-item-selected)]' : ''}`}
                  >
                    <button type="button">
                      <Typography variant="body1" component="span">
                        {contributor.name}
                      </Typography>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4">
            <Button variant="contained" onClick={handleAdd} disabled={!selectedContributorRecord}>
              Add
            </Button>
            <Button variant="text" onClick={handleCreate}>
              Create new
            </Button>
          </div>
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default AddContributionModal;
