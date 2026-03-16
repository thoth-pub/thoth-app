'use client';

import { EditAwardForm, useAwardStateMachine, useUpdateAward } from '@/src/entities/award';
import type { AwardRole } from '@/src/entities/award/model/award.types';
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

  const updateStatement = (statement: string) => {
    if (!activeAward) return;

    update({ ...activeAward, statement });
    updateAward({ ...activeAward, statement });
  };

  const updateRole = (role: AwardRole | null) => {
    if (!activeAward) return;

    update({ ...activeAward, role });
    updateAward({ ...activeAward, role });
  };

  if (!activeAward) return null;

  const { title, url, category, statement, role } = activeAward;

  return (
    <EditAwardForm
      title={title}
      url={url}
      category={category}
      statement={statement}
      role={role}
      onTitleUpdate={updateTitle}
      onUrlUpdate={updateUrl}
      onCategoryUpdate={updateCategory}
      onStatementUpdate={updateStatement}
      onRoleUpdate={updateRole}
      onDone={finishEditing}
      onClose={finishEditing}
      isDoneDisabled={!title?.trim()}
    />
  );
};

export default EditAward;
