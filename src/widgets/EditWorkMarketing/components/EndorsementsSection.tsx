'use client';

import type { EndorsementEntity } from '@/src/entities/endorsement';
import { EndorsementsList } from '@/src/entities/endorsement';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent, Typography } from '@/src/shared/ui';

import AddEndorsement from '../../../features/endorsement/AddEndorsement/AddEndorsement';
import EditEndorsement from '../../../features/endorsement/EditEndorsement/EditEndorsement';
import { useEditEndorsements } from '../hooks/useEditEndorsements';

type EndorsementsSectionProps = {
  workId: WorkId;
  endorsements: EndorsementEntity[];
};

export const EndorsementsSection = ({ workId, endorsements: mockEndorsements }: EndorsementsSectionProps) => {
  const {
    activeEndorsement,
    isNewEndorsement,
    editDisabled,
    deleteLoading,
    editEndorsement,
    addEndorsement,
    dragEnd,
    deleteEndorsement,
  } = useEditEndorsements(workId, mockEndorsements);

  return (
    <>
      <Typography variant="h2" className="pl-4">
        <TranslatedContent content="endorsements" />
      </Typography>
      <EndorsementsList
        activeEndorsement={activeEndorsement}
        endorsements={mockEndorsements}
        form={<EditEndorsement workId={workId} />}
        editDisabled={editDisabled}
        deleteLoading={deleteLoading}
        onDelete={deleteEndorsement}
        onEdit={editEndorsement}
        onDragEnd={dragEnd}
      />
      {isNewEndorsement && <AddEndorsement workId={workId} endorsements={mockEndorsements} />}
      <AddButton className="px-4 capitalize" onAdd={addEndorsement} disabled={isNewEndorsement}>
        <TranslatedContent content="actions.addNewEndorsement" />
      </AddButton>
    </>
  );
};
