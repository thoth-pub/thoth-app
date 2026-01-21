'use client';

import { Activity, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FundingsTable, useCreateFunding, useFundingsStateMachine } from '@/src/entities/funding';
import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { BaseEditSectionProps, isAllFundingRecommendationsFilled, isDefaultId } from '@/src/shared';
import { AddButton, RecommendedSection, Typography } from '@/src/shared/ui';
import { areFundingsEqual, getDefaultFunding } from '@/src/shared/utils';

import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';
import {
  useChaptersFundings,
  useChaptersFundingsGrantNumbers,
  useChaptersFundingsInstitutions,
  useChaptersFundingsProgram,
} from './hooks';
import { useChaptersFundingsProjects } from './hooks';

type EditChaptersFundingsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersFundings = (props: EditChaptersFundingsProps) => {
  const { chapters } = props;

  const { activeFunding, edit, close, update } = useFundingsStateMachine();

  const { t } = useTranslation();

  const isAllFundingsEmpty = chapters.every((chapter) => chapter.fundings.length === 0);
  const { uniqueFundings, deleteFundings } = useChaptersFundings(chapters);

  const [fundings, setFundings] = useState<FundingEntity[]>(uniqueFundings);
  const { updateProjects, updateProjectsShortName } = useChaptersFundingsProjects({ chapters, fundings });
  const { updatePrograms } = useChaptersFundingsProgram({ chapters, fundings });
  const { updateGrantNumbers } = useChaptersFundingsGrantNumbers({ chapters, fundings });
  const { updateInstitutions } = useChaptersFundingsInstitutions({ chapters, fundings });

  const isEmpty = fundings.length === 0;
  const isValid = isEmpty || fundings.every(isAllFundingRecommendationsFilled);

  const { createFundingForMultipleWorks } = useCreateFunding({
    workId: '',
  });

  const isFundingsSame = areFundingsEqual(chapters);

  const isSectionEnabled = isAllFundingsEmpty || (!isAllFundingsEmpty && isFundingsSame);

  const isNewFunding = activeFunding ? isDefaultId(activeFunding.id) : false;

  const addFunding = () => {
    edit({ ...getDefaultFunding() });
  };

  const createFunding = async (funding: FundingEntity) => {
    const chaptersIds = chapters.map((chapter) => chapter.id);

    const newFundings = await createFundingForMultipleWorks({
      relatedWorkIds: chaptersIds,
      funding,
    });

    if (!newFundings || newFundings.length === 0) return;

    setFundings([...fundings, newFundings[0]]);

    close();
  };

  const updateProject = async (updatedFunding: FundingEntity) => {
    const updatedFundings = await updateProjects(updatedFunding);
    update(updatedFunding);

    if (!updatedFundings) return;

    setFundings(updatedFundings);
  };

  const updateProjectShortName = async (updatedFunding: FundingEntity) => {
    const updatedFundings = await updateProjectsShortName(updatedFunding);
    update(updatedFunding);

    if (!updatedFundings) return;

    setFundings(updatedFundings);
  };

  const updateProgram = async (updatedFunding: FundingEntity) => {
    const updatedFundings = await updatePrograms(updatedFunding);
    update(updatedFunding);

    if (!updatedFundings) return;

    setFundings(updatedFundings);
  };

  const updateGrantNumber = async (updatedFunding: FundingEntity) => {
    const updatedFundings = await updateGrantNumbers(updatedFunding);
    update(updatedFunding);

    if (!updatedFundings) return;

    setFundings(updatedFundings);
  };

  const updateInstitution = async (updatedFunding: FundingEntity) => {
    const updatedFundings = await updateInstitutions(updatedFunding);
    update(updatedFunding);

    if (!updatedFundings) return;

    setFundings(updatedFundings);
  };

  const editFunding = (id: string) => {
    const funding = chapters.flatMap((chapter) => chapter.fundings).find((funding) => funding.id === id);

    if (!funding) return;

    edit({ ...funding });
  };

  const deleteChapterFundings = async (id: string) => {
    await deleteFundings(id);

    const updatedFundings = fundings.filter((funding) => funding.id !== id);

    setFundings(updatedFundings);
  };

  return (
    <RecommendedSection title="Fundings" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          <Activity mode={isSectionEnabled ? 'visible' : 'hidden'}>
            <FundingsTable
              activeFunding={activeFunding}
              fundings={fundings}
              showRecommendations={showRecommendations}
              onEdit={editFunding}
              onDelete={deleteChapterFundings}
              form={
                <EditFunding
                  workId=""
                  onProjectUpdate={updateProject}
                  onProjectShortNameUpdate={updateProjectShortName}
                  onProgramUpdate={updateProgram}
                  onGrantNumberUpdate={updateGrantNumber}
                  onInstitutionUpdate={updateInstitution}
                />
              }
            />
            {isNewFunding && <AddFunding workId="" onCreate={createFunding} />}
            <AddButton className="px-4 capitalize" onAdd={addFunding} disabled={isNewFunding}>
              {t('add new funding')}
            </AddButton>
          </Activity>

          <Activity mode={isSectionEnabled ? 'hidden' : 'visible'}>
            <Typography className="pl-4">
              This section is unavailable because the fundings in selected chapters are not the same. Please check the
              fundings and try again.
            </Typography>
          </Activity>
        </>
      )}
    </RecommendedSection>
  );
};

export default EditChaptersFundings;
