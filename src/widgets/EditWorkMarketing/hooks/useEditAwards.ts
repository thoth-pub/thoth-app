'use client';

import { useAwardStateMachine, useDeleteAward, useMoveAward, useUpdateAward } from '@/src/entities/award';
import type { AwardEntity } from '@/src/entities/award/model/award.types';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

const defaultAward: AwardEntity = {
  id: appConfig.defaultId,
  workId: '',
  title: '',
  url: '',
  category: '',
  note: '',
  orderNumber: 0,
};

export const useEditAwards = (workId: WorkId) => {
  const { work } = useWork(workId);
  const { activeEntity: activeAward, edit } = useAwardStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteAward: deleteAwardMutation, loading: deleteLoading } = useDeleteAward({ workId });
  const { updateAward } = useUpdateAward({ workId });
  const { moveAward } = useMoveAward({ workId });

  const isNewAward = activeAward ? isDefaultId(activeAward.id) : false;

  const editAward = (id: string) => {
    const award = work.awards.find((award) => award.id === id);

    if (!award) return;

    edit({ ...award });
  };

  const addAward = () => {
    edit({ ...defaultAward });
  };

  const dragEnd = async (data: AwardEntity[]) => {
    const updatedData = data.map((award, index) => ({ ...award, orderNumber: index + 1 }));

    const awardToUpdate = updatedData.find((award, index) => work.awards[index].id !== award.id);

    if (!awardToUpdate) return;

    await moveAward({ awardId: awardToUpdate.id, newOrdinal: awardToUpdate.orderNumber });
  };

  const deleteAward = async (id: string) => {
    await deleteAwardMutation(id);

    const awardsWithUpdatedOrderNumbers = work.awards
      .filter((award) => award.id !== id)
      .map((award, index) => ({
        ...award,
        orderNumber: index + 1,
      }));

    const promises = awardsWithUpdatedOrderNumbers.map((award) => {
      return updateAward({ ...award, orderNumber: award.orderNumber });
    });

    await Promise.all(promises);
  };

  return {
    awards: work.awards,
    activeAward,
    isNewAward,
    editDisabled: !!activeFormId,
    deleteLoading,
    editAward,
    addAward,
    dragEnd,
    deleteAward,
  };
};
