'use client';

import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { useWork } from '@/src/entities/work';
import { QueryKeys, type BaseEditSectionProps } from '@/src/shared';
import { useQueryClient } from '@tanstack/react-query';

export const useContributionsTable = ({ workId, queryToken }: BaseEditSectionProps) => {
  const { work, deleteContribution } = useWork(workId, queryToken);

  const { updateContribution } = useWork(workId, queryToken);

  const { activeContribution, edit } = useContributionStateMachine();
  const queryClient = useQueryClient();
  const [items, setItems] = useState(work.contributions);

  useEffect(() => {
    setItems(work.contributions);
  }, [work.contributions]);

  const dragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // onReorderEnd?.(newItems);

        return newItems;
      });
    }
  };

  const editContribution = (id: ContributionId) => {
    const contribution = items.find((contribution) => contribution.id === id);

    if (!contribution) return;

    edit(contribution);
  };

  const switchMainStatus = (id: ContributionId) => {
    const contribution = items.find((contribution) => contribution.id === id);

    if (!contribution) return;

    updateContribution({ ...contribution, isMain: !contribution.isMain });

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  const deleteWorkContribution = async (id: ContributionId) => {
    const contribution = items.find((contribution) => contribution.id === id);

    if (!contribution) return;

    await deleteContribution(id);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    setItems((items) => items.filter((item) => item.id !== contribution.id));
  };

  return {
    contributions: items,
    activeContribution,
    dragEnd,
    editContribution,
    deleteContribution: deleteWorkContribution,
    switchMainStatus,
  };
};
