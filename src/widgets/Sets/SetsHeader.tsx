'use client';

import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import type { WorkField } from '@/gql/graphql';
import { AddSet } from '@/src/features';
import { directionOptions, seriesOrderByOptions } from '@/src/shared/constants';
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

type SetsHeaderProps = {
  searchValue: string;
  direction: Direction;
  orderBy: string;
  onSearch: (value: string) => void;
  changeDirection: (value: Direction) => void;
  changeOrderBy: (value: WorkField) => void;
};

export const SetsHeader = (props: SetsHeaderProps) => {
  const { searchValue, direction, orderBy, onSearch, changeDirection, changeOrderBy } = props;

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.filters });

  const handleFilterOpen = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <ContentSection>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="h1">
          <TranslatedContent content="sets" namespace={NAMESPACES.enum.navigation} />
        </Typography>
        <TextField
          autoFocus
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
          placeholder={t('searchByTitle')}
          fullWidth
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <IconButton onClick={handleFilterOpen}>
            <FilterAltIcon color="primary" />
          </IconButton>
          <AddSet />
        </div>
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
              <InputLabel>
                <TranslatedContent content="orderBy" namespace={NAMESPACES.enum.filters} />
              </InputLabel>
              <TextField
                select
                options={seriesOrderByOptions}
                value={orderBy}
                onChange={(e) => changeOrderBy(e.target.value as WorkField)}
                translateOptions
              />
            </div>

            <div className="flex flex-col gap-2">
              <InputLabel>
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
