'use client';

import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { WorkField } from '@/gql/graphql';
import type { WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { directionOptions, workOrderByOptions, workStatusOptionsAlt } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { Direction } from '@/src/shared/types';
import {
  ContentSection,
  IconButton,
  InputAdornment,
  InputLabel,
  TextField,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { workTypeOptions } from '@/src/shared/utils';

type HeaderProps = {
  workStatus: string;
  workType: string;
  searchValue: string;
  direction: Direction;
  orderBy: string;
  onSearch: (value: string) => void;
  changeWorkStatus: (value: WorkStatus | 'All') => void;
  changeWorkType: (value: WorkType | 'All') => void;
  changeDirection: (value: Direction) => void;
  changeOrderBy: (value: WorkField) => void;
};

export const Header = (props: HeaderProps) => {
  const {
    workStatus,
    workType,
    searchValue,
    direction,
    orderBy,
    onSearch,
    changeWorkStatus,
    changeWorkType,
    changeDirection,
    changeOrderBy,
  } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.filters });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleFilterOpen = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <ContentSection>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="h1">
          <TranslatedContent content="books" namespace={NAMESPACES.enum.navigation} />
        </Typography>
        <TextField
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
          className="grow"
          placeholder={t('worksSearch')}
          fullWidth
          onChange={(e) => onSearch(e.target.value)}
          autoFocus
        />
        <IconButton onClick={handleFilterOpen}>
          <FilterAltIcon color="primary" />
        </IconButton>
      </div>

      <AnimatePresence mode="wait">
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeIn' }}
            className="grid grid-cols-2 gap-2 transition-all duration-1000 lg:grid-cols-4"
          >
            <div className="flex flex-col gap-2">
              <InputLabel className="capitalize">
                <TranslatedContent content="status" />
              </InputLabel>
              <TextField
                select
                options={[...workStatusOptionsAlt, { value: 'All', label: 'All' }]}
                value={workStatus}
                onChange={(e) => changeWorkStatus(e.target.value as WorkStatus | 'All')}
                translateOptions
              />
            </div>
            <div className="flex flex-col gap-2">
              <InputLabel className="capitalize">
                <TranslatedContent content="type" />
              </InputLabel>
              <TextField
                select
                options={[...workTypeOptions, { value: 'All', label: 'All' }]}
                value={workType}
                onChange={(e) => changeWorkType(e.target.value as WorkType | 'All')}
                translateOptions
              />
            </div>
            <div className="flex flex-col gap-2">
              <InputLabel className="capitalize">
                <TranslatedContent content="orderBy" namespace={NAMESPACES.enum.filters} />
              </InputLabel>
              <TextField
                select
                options={workOrderByOptions}
                value={orderBy}
                onChange={(e) => changeOrderBy(e.target.value as WorkField)}
                translateOptions
              />
            </div>
            <div className="flex flex-col gap-2">
              <InputLabel className="capitalize">
                <TranslatedContent content="direction" namespace={NAMESPACES.enum.filters} />
              </InputLabel>
              <TextField
                select
                options={directionOptions}
                value={direction}
                onChange={(e) => changeDirection(e.target.value as Direction)}
                translateOptions
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ContentSection>
  );
};
