'use client';

import { AwardsList } from '@/src/entities/award';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent, Typography } from '@/src/shared/ui';

import AddAward from '../../../features/award/AddAward/AddAward';
import EditAward from '../../../features/award/EditAward/EditAward';
import { useEditAwards } from '../hooks/useEditAwards';

type AwardsSectionProps = {
  workId: WorkId;
};

export const AwardsSection = ({ workId }: AwardsSectionProps) => {
  const {
    awards,
    activeAward,
    isNewAward,
    editDisabled,
    loading,
    fetching,
    deleteLoading,
    editAward,
    addAward,
    dragEnd,
    deleteAward,
  } = useEditAwards(workId);

  return (
    <>
      <Typography variant="h2" className="pl-4">
        <TranslatedContent content="awards" />
      </Typography>
      <AwardsList
        activeAward={activeAward}
        awards={awards}
        form={<EditAward workId={workId} />}
        editDisabled={editDisabled}
        loading={loading || fetching}
        deleteLoading={deleteLoading}
        onDelete={deleteAward}
        onEdit={editAward}
        onDragEnd={dragEnd}
      />
      {isNewAward && <AddAward workId={workId} awards={awards} />}
      <AddButton className="px-4 capitalize" onAdd={addAward} disabled={isNewAward}>
        <TranslatedContent content="actions.addNewAward" />
      </AddButton>
    </>
  );
};
