'use client';

import type { CountryCode } from '@/gql/graphql';
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

  const updateJury = (jury: string) => {
    if (!activeAward) return;

    update({ ...activeAward, jury });
    updateAward({ ...activeAward, jury });
  };

  const updateYear = (year: string) => {
    if (!activeAward) return;

    update({ ...activeAward, year });
    updateAward({ ...activeAward, year });
  };

  const updateCountry = (country: CountryCode | null) => {
    if (!activeAward) return;

    update({ ...activeAward, country });
    updateAward({ ...activeAward, country });
  };

  if (!activeAward) return null;

  const { title, url, category, statement, role, jury, year, country } = activeAward;

  return (
    <EditAwardForm
      title={title}
      url={url}
      category={category}
      statement={statement}
      role={role}
      jury={jury}
      year={year}
      country={country}
      onTitleUpdate={updateTitle}
      onUrlUpdate={updateUrl}
      onCategoryUpdate={updateCategory}
      onStatementUpdate={updateStatement}
      onRoleUpdate={updateRole}
      onJuryUpdate={updateJury}
      onYearUpdate={updateYear}
      onCountryUpdate={updateCountry}
      onDone={finishEditing}
      onClose={finishEditing}
      isDoneDisabled={!title?.trim()}
    />
  );
};

export default EditAward;
