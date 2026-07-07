'use client';

import { useAwardStateMachine, useDeleteAward, useMoveAward } from '@/src/entities/award';
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
  statement: '',
  role: null,
  orderNumber: 0,
  jury: '',
  year: '',
  country: null,
};

export const useEditAwards = (workId: WorkId) => {
  const { work, loading, fetching } = useWork(workId);
  const { activeEntity: activeAward, edit } = useAwardStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteAward: deleteAwardMutation, loading: deleteLoading } = useDeleteAward({ workId });
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

    const awardToUpdate = updatedData.find((award, index) => work.awards[index]?.id !== award.id);

    if (!awardToUpdate) return;

    await moveAward({ awardId: awardToUpdate.id, newOrdinal: awardToUpdate.orderNumber });
  };

  const deleteAward = async (id: string) => {
    await deleteAwardMutation(id);
  };

  return {
    awards: work.awards,
    activeAward,
    isNewAward,
    editDisabled: !!activeFormId,
    loading,
    fetching,
    deleteLoading,
    editAward,
    addAward,
    dragEnd,
    deleteAward,
  };
};
