'use client';

import { Activity } from 'react';

import { FundingsList, useCreateFunding, useFundingStateMachine } from '@/src/entities/funding';
import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, RecommendedSection, TranslatedContent, Typography } from '@/src/shared/ui';
import {
  areFundingsEqual,
  getDefaultFunding,
  isAllFundingRecommendationsFilled,
  isDefaultId,
} from '@/src/shared/utils';

import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';
import {
  useChaptersFundings,
  useChaptersFundingsGrantNumbers,
  useChaptersFundingsInstitutions,
  useChaptersFundingsProgram,
  useChaptersFundingsProjects,
} from './hooks';

type EditChaptersFundingsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersFundings = (props: EditChaptersFundingsProps) => {
  const { chapters } = props;

  const { activeEntity: activeFunding, edit, finishEditing, update } = useFundingStateMachine();

  const isAllFundingsEmpty = chapters.every((chapter) => chapter.fundings.length === 0);
  const { uniqueFundings, deleteFundings, deleteLoading } = useChaptersFundings(chapters);

  const { updateProjects, updateProjectsShortName } = useChaptersFundingsProjects({
    chapters,
    fundings: uniqueFundings,
  });
  const { updatePrograms } = useChaptersFundingsProgram({ chapters, fundings: uniqueFundings });
  const { updateGrantNumbers } = useChaptersFundingsGrantNumbers({ chapters, fundings: uniqueFundings });
  const { updateInstitutions } = useChaptersFundingsInstitutions({ chapters, fundings: uniqueFundings });

  const isEmpty = uniqueFundings.length === 0;
  const isValid = isEmpty || uniqueFundings.every(isAllFundingRecommendationsFilled);

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

    finishEditing();
  };

  const updateProject = async (updatedFunding: FundingEntity) => {
    await updateProjects(updatedFunding);
    update(updatedFunding);
  };

  const updateProjectShortName = async (updatedFunding: FundingEntity) => {
    await updateProjectsShortName(updatedFunding);
    update(updatedFunding);
  };

  const updateProgram = async (updatedFunding: FundingEntity) => {
    await updatePrograms(updatedFunding);
    update(updatedFunding);
  };

  const updateGrantNumber = async (updatedFunding: FundingEntity) => {
    await updateGrantNumbers(updatedFunding);
    update(updatedFunding);
  };

  const updateInstitution = async (updatedFunding: FundingEntity) => {
    await updateInstitutions(updatedFunding);
    update(updatedFunding);
  };

  const editFunding = (id: string) => {
    const funding = chapters.flatMap((chapter) => chapter.fundings).find((funding) => funding.id === id);

    if (!funding) return;

    edit({ ...funding });
  };

  const deleteChapterFundings = async (id: string) => {
    await deleteFundings(id);
  };

  return (
    <RecommendedSection title={<TranslatedContent content="fundings" />} isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          <Activity mode={isSectionEnabled ? 'visible' : 'hidden'}>
            <FundingsList
              activeFunding={activeFunding}
              fundings={uniqueFundings}
              showRecommendations={showRecommendations}
              deleteLoading={deleteLoading}
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
              add new funding
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
