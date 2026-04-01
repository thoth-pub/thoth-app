'use client';

import { useState } from 'react';

import type { CountryCode } from '@/gql/graphql';
import { EditAwardForm, useAwardStateMachine, useCreateAward } from '@/src/entities/award';
import type { AwardEntity, AwardRole } from '@/src/entities/award/model/award.types';
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

  const updateStatement = (statement: string) => {
    if (!award) return;

    setAward({ ...award, statement });
  };

  const updateRole = (role: AwardRole | null) => {
    if (!award) return;

    setAward({ ...award, role });
  };

  const updateJury = (jury: string) => {
    if (!award) return;

    setAward({ ...award, jury });
  };

  const updateYear = (year: string) => {
    if (!award) return;

    setAward({ ...award, year });
  };

  const updateCountry = (country: CountryCode | null) => {
    if (!award) return;

    setAward({ ...award, country });
  };

  if (!award) return null;

  const { title, url, category, statement, role, jury, year, country } = award;

  return (
    <TableNewEntityFormWrapper>
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
        onDone={create}
        onClose={finishEditing}
        isDoneDisabled={!title?.trim()}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddAward;
