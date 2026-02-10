'use client';

import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import type { SeriesField, SeriesType } from '@/gql/graphql';
import { AddSeries } from '@/src/features';
import type { Direction } from '@/src/shared';
import { directionOptions, seriesOrderByOptions, seriesTypeOptions } from '@/src/shared/constants/formFields';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { IconButton, InputAdornment, InputLabel, TextField, TranslatedContent, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type SeriesHeaderProps = {
  seriesType: string;
  searchValue: string;
  direction: Direction;
  orderBy: string;
  onSearch: (value: string) => void;
  changeSeriesType: (value: SeriesType | 'All') => void;
  changeDirection: (value: Direction) => void;
  changeOrderBy: (value: SeriesField) => void;
};

export const SeriesHeader = (props: SeriesHeaderProps) => {
  const { seriesType, searchValue, direction, orderBy, onSearch, changeSeriesType, changeDirection, changeOrderBy } =
    props;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.filters });

  const handleFilterOpen = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  return (
    <ContentSection>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="h1" className="pl-3">
          <TranslatedContent content="series" namespace={NAMESPACES.enum.navigation} />
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
          placeholder={t('searchByTitle')}
          fullWidth
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <IconButton onClick={handleFilterOpen}>
            <FilterAltIcon color="primary" />
          </IconButton>
          <AddSeries />
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
              <InputLabel className="capitalize">
                <TranslatedContent content="type" />
              </InputLabel>
              <TextField
                select
                options={[...seriesTypeOptions, { value: 'All', label: 'All' }]}
                value={seriesType}
                onChange={(e) => changeSeriesType(e.target.value as SeriesType | 'All')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <InputLabel>Order by</InputLabel>
              <TextField
                select
                options={seriesOrderByOptions}
                value={orderBy}
                onChange={(e) => changeOrderBy(e.target.value as SeriesField)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <InputLabel>Direction</InputLabel>
              <TextField
                select
                options={directionOptions}
                value={direction}
                onChange={(e) => changeDirection(e.target.value as Direction)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ContentSection>
  );
};
