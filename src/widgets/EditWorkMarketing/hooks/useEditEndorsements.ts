'use client';

import {
  useDeleteEndorsement,
  useEndorsementStateMachine,
  useMoveEndorsement,
  useUpdateEndorsement,
} from '@/src/entities/endorsement';
import type { EndorsementEntity } from '@/src/entities/endorsement/model/endorsement.types';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

const defaultEndorsement: EndorsementEntity = {
  id: appConfig.defaultId,
  workId: '',
  authorName: '',
  authorRole: '',
  url: '',
  text: '',
  orderNumber: 0,
};

export const useEditEndorsements = (workId: WorkId) => {
  const { work } = useWork(workId);
  const { activeEntity: activeEndorsement, edit } = useEndorsementStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteEndorsement: deleteEndorsementMutation, loading: deleteLoading } = useDeleteEndorsement({ workId });
  const { updateEndorsement } = useUpdateEndorsement({ workId });
  const { moveEndorsement } = useMoveEndorsement({ workId });

  const isNewEndorsement = activeEndorsement ? isDefaultId(activeEndorsement.id) : false;

  const editEndorsement = (id: string) => {
    const endorsement = work.endorsements.find((endorsement) => endorsement.id === id);

    if (!endorsement) return;

    edit({ ...endorsement });
  };

  const addEndorsement = () => {
    edit({ ...defaultEndorsement });
  };

  const dragEnd = async (data: EndorsementEntity[]) => {
    const updatedData = data.map((endorsement, index) => ({ ...endorsement, orderNumber: index + 1 }));

    const endorsementToUpdate = updatedData.find(
      (endorsement, index) => work.endorsements[index].id !== endorsement.id,
    );

    if (!endorsementToUpdate) return;

    await moveEndorsement({
      endorsementId: endorsementToUpdate.id,
      newOrdinal: endorsementToUpdate.orderNumber,
    });
  };

  const deleteEndorsement = async (id: string) => {
    await deleteEndorsementMutation(id);

    const endorsementsWithUpdatedOrderNumbers = work.endorsements
      .filter((endorsement) => endorsement.id !== id)
      .map((endorsement, index) => ({
        ...endorsement,
        orderNumber: index + 1,
      }));

    const promises = endorsementsWithUpdatedOrderNumbers.map((endorsement) => {
      return updateEndorsement({ ...endorsement, orderNumber: endorsement.orderNumber });
    });

    await Promise.all(promises);
  };

  return {
    endorsements: work.endorsements,
    activeEndorsement,
    isNewEndorsement,
    editDisabled: !!activeFormId,
    deleteLoading,
    editEndorsement,
    addEndorsement,
    dragEnd,
    deleteEndorsement,
  };
};
