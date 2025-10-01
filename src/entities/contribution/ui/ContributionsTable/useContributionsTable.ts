'use client';

import { DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

type UseContributionsTableProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useContributionsTable = ({ workId, queryToken }: UseContributionsTableProps) => {
  const { work, deleteContribution } = useWork(workId, queryToken);

  const { updateContribution } = useWork(workId, queryToken);

  const { activeContribution, edit } = useContributionStateMachine();
  const [items, setItems] = useState(work.contributions);
  const sensors = useSensors(useSensor(PointerSensor));

  const isEqual = work.contributions.every((contribution, index) => {
    const item = items[index];

    if (!item) return false;

    return (
      item.id === contribution.id &&
      item.fullName === contribution.fullName &&
      item.type === contribution.type &&
      item.biography === contribution.biography &&
      item.contributorId === contribution.contributorId &&
      item.isMain === contribution.isMain &&
      item.orderNumber === contribution.orderNumber &&
      item.orcidId === contribution.orcidId &&
      item.website === contribution.website &&
      item.affiliations.length === contribution.affiliations.length &&
      item.affiliations.every((affiliation, index) => affiliation.id === contribution.affiliations[index].id)
    );
  });

  useEffect(() => {
    if (!isEqual) {
      setItems(work.contributions);
    }

    if (work.contributions.length !== items.length) {
      setItems(work.contributions);
    }
  }, [isEqual, items.length, work.contributions]);

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
  };

  const deleteWorkContribution = async (id: ContributionId) => {
    const contribution = items.find((contribution) => contribution.id === id);

    if (!contribution) return;

    await deleteContribution({ variables: { contributionId: id } });
    setItems((items) => items.filter((item) => item.id !== contribution.id));
  };

  return {
    contributions: items,
    activeContribution,
    sensors,
    dragEnd,
    editContribution,
    deleteContribution: deleteWorkContribution,
    switchMainStatus,
  };
};
