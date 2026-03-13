'use client';

import { useState } from 'react';

import { EditAwardForm, useAwardStateMachine, useCreateAward } from '@/src/entities/award';
import type { AwardEntity } from '@/src/entities/award/model/award.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

type AddAwardProps = BaseRecommendedSectionProps & {
  awards?: AwardEntity[];
};

const emptyAwards: AwardEntity[] = [];

const AddAward = (props: AddAwardProps) => {
  const { workId, awards = emptyAwards } = props;

  const { activeEntity: activeAward, finishEditing } = useAwardStateMachine();
  const [award, setAward] = useState<AwardEntity | null>(activeAward);
  const { createAward } = useCreateAward({ workId });

  const create = () => {
    if (!award) return;

    const lastAwardOrderNumber = [...awards].sort((a, b) => b.orderNumber - a.orderNumber)[0]?.orderNumber;

    createAward({
      ...award,
      orderNumber: lastAwardOrderNumber ? lastAwardOrderNumber + 1 : 1,
    });
    finishEditing();
  };

  const updateTitle = (title: string) => {
    if (!award) return;

    setAward({ ...award, title });
  };

  const updateUrl = (url: string) => {
    if (!award) return;

    setAward({ ...award, url });
  };

  const updateCategory = (category: string) => {
    if (!award) return;

    setAward({ ...award, category });
  };

  const updateNote = (note: string) => {
    if (!award) return;

    setAward({ ...award, note });
  };

  if (!award) return null;

  const { title, url, category, note } = award;

  return (
    <TableNewEntityFormWrapper>
      <EditAwardForm
        title={title}
        url={url}
        category={category}
        note={note}
        onTitleUpdate={updateTitle}
        onUrlUpdate={updateUrl}
        onCategoryUpdate={updateCategory}
        onNoteUpdate={updateNote}
        onDone={create}
        onClose={finishEditing}
        isDoneDisabled={!title?.trim()}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddAward;
