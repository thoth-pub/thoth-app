'use client';

import { EditAwardForm, useAwardStateMachine, useUpdateAward } from '@/src/entities/award';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

const EditAward = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeAward, update, finishEditing } = useAwardStateMachine();
  const { updateAward } = useUpdateAward({ workId });

  const updateTitle = (title: string) => {
    if (!activeAward) return;

    update({ ...activeAward, title });
    updateAward({ ...activeAward, title });
  };

  const updateUrl = (url: string) => {
    if (!activeAward) return;

    update({ ...activeAward, url });
    updateAward({ ...activeAward, url });
  };

  const updateCategory = (category: string) => {
    if (!activeAward) return;

    update({ ...activeAward, category });
    updateAward({ ...activeAward, category });
  };

  const updateNote = (note: string) => {
    if (!activeAward) return;

    update({ ...activeAward, note });
    updateAward({ ...activeAward, note });
  };

  if (!activeAward) return null;

  const { title, url, category, note } = activeAward;

  return (
    <EditAwardForm
      title={title}
      url={url}
      category={category}
      note={note}
      onTitleUpdate={updateTitle}
      onUrlUpdate={updateUrl}
      onCategoryUpdate={updateCategory}
      onNoteUpdate={updateNote}
      onDone={finishEditing}
      onClose={finishEditing}
      isDoneDisabled={!title?.trim()}
    />
  );
};

export default EditAward;
