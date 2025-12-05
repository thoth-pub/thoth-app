'use client';

import { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { FormFieldOption } from '@/src/shared';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { Header } from './components/Header';
import { UploadModal } from './components/UploadModal';
import { WorksSpeedDial } from './components/WorksSpeedDial';
import { WorksTable } from './components/WorksTable';
import { useAllWorks } from './useAllWorks';

type AllWorksProps = {
  imprintsOptions: FormFieldOption[];
  serieses: SeriesEntity[];
};

const AllWorks = (props: AllWorksProps) => {
  const { imprintsOptions, serieses } = props;

  const {
    loading,
    works,
    navigateToWork,
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
        <WorksTable
          loading={loading}
          works={works}
          page={activePage}
          pagesCount={totalPagesCount}
          onPageChange={changePage}
          navigateToWork={navigateToWork}
        />
      </ContentSection>
      <WorksSpeedDial onUpload={openUpload} />
      <UploadModal
        imprintsOptions={imprintsOptions}
        serieses={serieses}
        isOpen={isUploadModalOpen}
        onClose={closeUpload}
      />
    </>
  );
};

export default AllWorks;
