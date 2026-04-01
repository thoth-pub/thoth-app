'use client';

import { EndorsementsList } from '@/src/entities/endorsement';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent, Typography } from '@/src/shared/ui';

import AddEndorsement from '../../../features/endorsement/AddEndorsement/AddEndorsement';
import EditEndorsement from '../../../features/endorsement/EditEndorsement/EditEndorsement';
import { useEditEndorsements } from '../hooks/useEditEndorsements';

type EndorsementsSectionProps = {
  workId: WorkId;
};

export const EndorsementsSection = ({ workId }: EndorsementsSectionProps) => {
  const {
    endorsements,
    activeEndorsement,
    isNewEndorsement,
    editDisabled,
    loading,
    fetching,
    deleteLoading,
    editEndorsement,
    addEndorsement,
    dragEnd,
    deleteEndorsement,
  } = useEditEndorsements(workId);

  return (
    <>
      <Typography variant="h2" className="pl-4">
        <TranslatedContent content="endorsements" />
      </Typography>
      <EndorsementsList
        activeEndorsement={activeEndorsement}
        endorsements={endorsements}
        form={<EditEndorsement workId={workId} />}
        editDisabled={editDisabled}
        loading={loading || fetching}
        deleteLoading={deleteLoading}
        onDelete={deleteEndorsement}
        onEdit={editEndorsement}
        onDragEnd={dragEnd}
      />
      {isNewEndorsement && <AddEndorsement workId={workId} endorsements={endorsements} />}
      <AddButton className="px-4 capitalize" onAdd={addEndorsement} disabled={isNewEndorsement}>
        <TranslatedContent content="actions.addNewEndorsement" />
      </AddButton>
    </>
  );
};
