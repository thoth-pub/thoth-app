'use client';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import useSetStateMachine from '@/src/entities/sets/store/hooks/useSetStateMachine';
import SetsCardList from '@/src/entities/sets/ui/SetsCardList/SetsCardList';
import { EditSet } from '@/src/features';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TranslatedContent, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { SetsHeader } from './SetsHeader';
import { useSetsList } from './useSetsList';

const Sets = () => {
  const { activeSet } = useSetStateMachine();

  const {
    loading,
    isFetched,
    sets,
    activePage,
    totalPagesCount,
    direction,
    orderBy,
    searchValue,
    setSearchValue,
    changeDirection,
    changeOrderBy,
    changePage,
  } = useSetsList();

  const { isImprintEditable } = useActivePublisherPermissions();

  return (
    <>
      <SetsHeader
        searchValue={searchValue}
        direction={direction}
        orderBy={orderBy}
        onSearch={setSearchValue}
        changeDirection={changeDirection}
        changeOrderBy={changeOrderBy}
      />
      <ContentSection>
        {sets.length === 0 && isFetched && (
          <Typography component="span" className="flex h-full min-h-100 items-center justify-center">
            <TranslatedContent content="emptyTable" namespace={NAMESPACES.enum.sets} />
          </Typography>
        )}
        <SetsCardList
          loading={loading}
          sets={sets}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          form={<EditSet setId={activeSet?.id ?? ''} isImprintEditable={isImprintEditable} />}
        />
      </ContentSection>
    </>
  );
};

export default Sets;
