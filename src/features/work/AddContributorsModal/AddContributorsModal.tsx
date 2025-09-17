'use client';

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { type ChangeEvent, useState } from 'react';

import { type ContributorEntity, useContributors } from '@/src/entities/contributor';
import type { ContributionType, ContributorId } from '@/src/entities/contributor/model/contributor.types';
import type { FormFieldOption } from '@/src/shared';
import { config } from '@/src/shared/config';
import { useDebouncedValue } from '@/src/shared/hooks';
import {
  AddButton,
  Button,
  CircullarProgress,
  FormFieldWrapper,
  IconButton,
  InputAdornment,
  InputLabel,
  Modal,
  TextField,
  Typography,
} from '@/src/shared/ui';

type AddContributorsModalProps = {
  onAdd: (data: ContributorEntity, contributionType: ContributionType) => void;
  contributorTypeOptions: FormFieldOption[];
};

const AddContributorsModal = ({ onAdd, contributorTypeOptions }: AddContributorsModalProps) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebouncedValue(searchValue, config.fieldsDebounceDelay);
  const { contributors, loading } = useContributors({ filter: debouncedValue });
  const [selected, setSelected] = useState<ContributorId | ''>('');
  const [selectedContributionType, setSelectedContributionType] = useState(contributorTypeOptions[0].value);
  const [open, setOpen] = useState(false);

  const selectedContributorRecord = contributors.find((contributor) => contributor.id === selected);

  const isEmpty = contributors.length === 0 && !loading && debouncedValue.length > 0;
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

    onAdd(selectedContributorRecord, selectedContributionType as ContributionType);
    handleModalState();
    setSelected('');
  };

  const handleSelectContributionType = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedContributionType(e.target.value);
  };

  return (
    <>
      <AddButton onAdd={handleModalState}>Add Contributor</AddButton>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex h-full items-center justify-center">
          <div className="m-auto flex max-h-150 w-full max-w-175 flex-col gap-8 rounded-2xl bg-[var(--color-modal-background)] p-8">
            <div className="flex justify-between">
              <Typography variant="h2" component="h3" className="text-[var(--color-typography)]">
                Add contributor
              </Typography>
              <IconButton onClick={handleModalState}>
                <CloseIcon className="color-[var(--color-typography)]" />
              </IconButton>
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
                  {isEmpty && (
                    <li className="w-full p-2 text-center">
                      <Typography variant="body1" component="span">
                        No contributors found
                      </Typography>
                    </li>
                  )}
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

            <FormFieldWrapper>
              <InputLabel htmlFor="contributionType">Contribution type</InputLabel>
              <TextField
                select
                value={selectedContributionType}
                options={contributorTypeOptions}
                onChange={handleSelectContributionType}
              />
            </FormFieldWrapper>

            <div className="flex gap-4">
              <Button variant="contained" onClick={handleAdd} disabled={!selectedContributorRecord}>
                Add
              </Button>
              <Button variant="text" className="px-5" onClick={() => setOpen(false)}>
                Create new
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddContributorsModal;
