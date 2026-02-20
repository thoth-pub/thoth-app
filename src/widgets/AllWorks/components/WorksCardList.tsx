'use client';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { CardsList, Pagination, TranslatedContent, Typography } from '@/src/shared/ui';

import { WorkCardListItem } from './WorkCardListItem';

type WorksCardListProps = {
  loading: boolean;
  works: WorkEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
  navigateToWork: (id: string) => void;
  onCreateNewEdition: (work: WorkEntity) => void;
  onCreateTranslation: (work: WorkEntity) => void;
};

export const WorksCardList = (props: WorksCardListProps) => {
  const { loading, works, page, pagesCount, onPageChange, navigateToWork, onCreateNewEdition, onCreateTranslation } =
    props;

  return (
    <>
      {works.length === 0 && !loading && (
        <Typography component="span" className="flex h-full min-h-100 items-center justify-center">
          <TranslatedContent content="emptyTable" namespace={NAMESPACES.enum.works} />
        </Typography>
      )}
      <CardsList items={works} loading={loading} backdropClassName="min-h-100" listClassName="min-h-100">
        {() => (
          <>
            {works.map((work) => (
              <WorkCardListItem
                key={work.id}
                work={work}
                createNewEdition={onCreateNewEdition}
                createTranslation={onCreateTranslation}
                navigateToWork={navigateToWork}
              />
            ))}
          </>
        )}
      </CardsList>
      <Pagination
        page={page}
        count={pagesCount}
        color="primary"
        className="ml-auto"
        showFirstButton
        showLastButton
        onChange={(_, value) => onPageChange(value)}
        disabled={loading}
      />
    </>
  );
};
