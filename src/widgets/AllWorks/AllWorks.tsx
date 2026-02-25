'use client';

import { WORK_COPY_VARIANTS } from '@/src/shared';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { Header } from './components/Header';
import { UploadModal } from './components/UploadModal';
import { WorksCardList } from './components/WorksCardList';
import { WorksSpeedDial } from './components/WorksSpeedDial';
import { useAllWorks } from './useAllWorks';

const AllWorks = () => {
  const {
    loading,
    isFetched,
    works,
    searchValue,
    setSearchValue,
    activePage,
    totalPagesCount,
    changePage,
    direction,
    changeDirection,
    workStatus,
    changeWorkStatus,
    workType,
    changeWorkType,
    orderBy,
    changeOrderBy,
    isUploadModalOpen,
    openUpload,
    closeUpload,
    navigateToWork,
    navigateToCopyWork,
    createNewWorkEdition,
    createWorkTranslation,
  } = useAllWorks();

  return (
    <>
      <Header
        searchValue={searchValue}
        onSearch={setSearchValue}
        workStatus={workStatus}
        changeWorkStatus={changeWorkStatus}
        workType={workType}
        changeWorkType={changeWorkType}
        direction={direction}
        changeDirection={changeDirection}
        orderBy={orderBy}
        changeOrderBy={changeOrderBy}
      />
      <ContentSection>
        <WorksCardList
          loading={!isFetched || loading}
          works={works}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          navigateToWork={navigateToWork}
          onCreateNewEdition={createNewWorkEdition}
          onCreateTranslation={createWorkTranslation}
        />
      </ContentSection>
      <WorksSpeedDial
        onUpload={openUpload}
        onCreateTranslation={() => navigateToCopyWork(WORK_COPY_VARIANTS.TRANSLATION)}
        onCreateNewEdition={() => navigateToCopyWork(WORK_COPY_VARIANTS.REISSUE)}
      />
      <UploadModal isOpen={isUploadModalOpen} onClose={closeUpload} />
    </>
  );
};

export default AllWorks;
