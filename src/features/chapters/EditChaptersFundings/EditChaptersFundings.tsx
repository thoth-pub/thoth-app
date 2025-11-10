'use client';

import {
  FundingsTable,
  useCreateFunding,
  useDeleteFunding,
  useFundingsStateMachine,
  useUpdateFunding,
} from '@/src/entities/funding';
import { FundingEntity, FundingId } from '@/src/entities/funding/model/funding.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { BaseEditSectionProps, isDefaultId } from '@/src/shared';
import { AddButton, RecommendedSection, Typography } from '@/src/shared/ui';
import { getDefaultFunding } from '@/src/shared/utils';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddFunding from '../../fundings/AddFunding/AddFunding';
import EditFunding from '../../fundings/EditFunding/EditFunding';

type EditChaptersFundingsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersFundings = (props: EditChaptersFundingsProps) => {
  const { queryToken, chapters } = props;

  const { activeFunding, edit } = useFundingsStateMachine();

  const { t } = useTranslation();

  const isAllFundingsEmpty = chapters.every((chapter) => chapter.fundings.length === 0);

  const uniqueFundings = useMemo(() => {
    const uniqueFundings: FundingEntity[] = [];

    chapters.forEach(({ fundings }) => {
      fundings.forEach((funding) => {
        const existingFunding = fundings.find((funding) => {
          return uniqueFundings.some(
            (f) =>
              f.institutionId === funding.institutionId &&
              f.grantNumber === funding.grantNumber &&
              f.program === funding.program &&
              f.projectName === funding.projectName,
          );
        });

        if (existingFunding) return;

        uniqueFundings.push(funding);
      });
    });

    return uniqueFundings;
  }, [chapters]);

  const [fundings, setFundings] = useState<FundingEntity[]>(uniqueFundings);

  const { createFundingForMultipleWorks } = useCreateFunding({
    queryToken,
    workId: '',
  });

  const { updateFunding } = useUpdateFunding({ workId: '', queryToken });

  const { deleteFundings } = useDeleteFunding({ workId: '', queryToken });

  const uniqueInstitutionIds = [
    ...new Set(chapters.flatMap((chapter) => chapter.fundings.map((funding) => funding.institutionId))),
  ];

  const uniqueGrantNumbers = [
    ...new Set(chapters.flatMap((chapter) => chapter.fundings.map((funding) => funding.grantNumber))),
  ];

  const uniquePrograms = [
    ...new Set(chapters.flatMap((chapter) => chapter.fundings.map((funding) => funding.program))),
  ];

  const uniqueProjectNames = [
    ...new Set(chapters.flatMap((chapter) => chapter.fundings.map((funding) => funding.projectName))),
  ];

  const uniqueProjectShortNames = [
    ...new Set(chapters.flatMap((chapter) => chapter.fundings.map((funding) => funding.projectShortname))),
  ];

  const uniqueJurisdictions = [
    ...new Set(chapters.flatMap((chapter) => chapter.fundings.map((funding) => funding.jurisdiction))),
  ];

  const isFundingsSame = chapters.every(({ fundings }) => {
    if (
      fundings.length !== uniqueInstitutionIds.length ||
      fundings.length !== uniqueGrantNumbers.length ||
      fundings.length !== uniquePrograms.length ||
      fundings.length !== uniqueProjectNames.length ||
      fundings.length !== uniqueProjectShortNames.length ||
      fundings.length !== uniqueJurisdictions.length
    )
      return false;

    return fundings.every((funding) => {
      return (
        uniqueInstitutionIds.includes(funding.institutionId) &&
        uniqueGrantNumbers.includes(funding.grantNumber) &&
        uniquePrograms.includes(funding.program) &&
        uniqueProjectNames.includes(funding.projectName) &&
        uniqueJurisdictions.includes(funding.jurisdiction) &&
        uniqueProjectShortNames.includes(funding.projectShortname)
      );
    });
  });

  const isSectionEnabled = isAllFundingsEmpty || (!isAllFundingsEmpty && isFundingsSame);

  const isNewFunding = activeFunding && isDefaultId(activeFunding.id);

  const addFunding = () => {
    if (activeFunding) close();

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
    const fundingsToUpdate = fundings.filter(
      (funding) =>
        funding.projectName !== updatedFunding.projectName &&
        funding.grantNumber === updatedFunding.grantNumber &&
        funding.program === updatedFunding.program &&
        funding.projectShortname === updatedFunding.projectShortname &&
        funding.jurisdiction === updatedFunding.jurisdiction &&
        funding.institutionId === updatedFunding.institutionId,
    );

    if (fundingsToUpdate.length === 0) return;

    const fundingsIds = fundingsToUpdate.map((funding) => funding.id);

    chapters.forEach(async (chapter) => {
      const chapterFundings = chapter.fundings.filter(
        (funding) =>
          funding.projectName !== updatedFunding.projectName &&
          funding.grantNumber === updatedFunding.grantNumber &&
          funding.program === updatedFunding.program &&
          funding.projectShortname === updatedFunding.projectShortname &&
          funding.jurisdiction === updatedFunding.jurisdiction &&
          funding.institutionId === updatedFunding.institutionId,
      );

      if (chapterFundings.length === 0) return;
      await updateFunding({ ...chapterFundings[0], projectName: updatedFunding.projectName }, chapter.id);
    });

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, projectName: updatedFunding.projectName };
    });

    setFundings(updatedFundings);
  };

  const updateProjectShortName = async (updatedFunding: FundingEntity) => {
    const fundingsToUpdate = fundings.filter(
      (funding) =>
        funding.projectShortname !== updatedFunding.projectShortname &&
        funding.grantNumber === updatedFunding.grantNumber &&
        funding.program === updatedFunding.program &&
        funding.projectName === updatedFunding.projectName &&
        funding.jurisdiction === updatedFunding.jurisdiction &&
        funding.institutionId === updatedFunding.institutionId,
    );

    if (fundingsToUpdate.length === 0) return;

    const fundingsIds = fundingsToUpdate.map((funding) => funding.id);

    chapters.forEach(async (chapter) => {
      const chapterFundings = chapter.fundings.filter(
        (funding) =>
          funding.projectName === updatedFunding.projectName &&
          funding.grantNumber === updatedFunding.grantNumber &&
          funding.program === updatedFunding.program &&
          funding.projectShortname !== updatedFunding.projectShortname &&
          funding.jurisdiction === updatedFunding.jurisdiction &&
          funding.institutionId === updatedFunding.institutionId,
      );

      if (chapterFundings.length === 0) return;
      await updateFunding({ ...chapterFundings[0], projectShortname: updatedFunding.projectShortname }, chapter.id);
    });

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, projectShortname: updatedFunding.projectShortname };
    });

    setFundings(updatedFundings);
  };

  const updateJurisdiction = async (updatedFunding: FundingEntity) => {
    const fundingsToUpdate = fundings.filter(
      (funding) =>
        funding.grantNumber === updatedFunding.grantNumber &&
        funding.program === updatedFunding.program &&
        funding.projectName === updatedFunding.projectName &&
        funding.projectShortname === updatedFunding.projectShortname &&
        funding.jurisdiction !== updatedFunding.jurisdiction &&
        funding.institutionId === updatedFunding.institutionId,
    );

    if (fundingsToUpdate.length === 0) return;

    const fundingsIds = fundingsToUpdate.map((funding) => funding.id);

    chapters.forEach(async (chapter) => {
      const chapterFundings = chapter.fundings.filter(
        (funding) =>
          funding.projectName === updatedFunding.projectName &&
          funding.grantNumber === updatedFunding.grantNumber &&
          funding.program === updatedFunding.program &&
          funding.projectShortname === updatedFunding.projectShortname &&
          funding.jurisdiction !== updatedFunding.jurisdiction &&
          funding.institutionId === updatedFunding.institutionId,
      );

      if (chapterFundings.length === 0) return;
      await updateFunding({ ...chapterFundings[0], jurisdiction: updatedFunding.jurisdiction }, chapter.id);
    });

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, jurisdiction: updatedFunding.jurisdiction };
    });

    setFundings(updatedFundings);
  };

  const updateProgram = async (updatedFunding: FundingEntity) => {
    const fundingsToUpdate = fundings.filter(
      (funding) =>
        funding.program !== updatedFunding.program &&
        funding.grantNumber === updatedFunding.grantNumber &&
        funding.projectName === updatedFunding.projectName &&
        funding.projectShortname === updatedFunding.projectShortname &&
        funding.jurisdiction === updatedFunding.jurisdiction &&
        funding.institutionId === updatedFunding.institutionId,
    );

    if (fundingsToUpdate.length === 0) return;

    const fundingsIds = fundingsToUpdate.map((funding) => funding.id);

    chapters.forEach(async (chapter) => {
      const chapterFundings = chapter.fundings.filter(
        (funding) =>
          funding.projectName === updatedFunding.projectName &&
          funding.grantNumber === updatedFunding.grantNumber &&
          funding.program !== updatedFunding.program &&
          funding.projectShortname === updatedFunding.projectShortname &&
          funding.jurisdiction === updatedFunding.jurisdiction &&
          funding.institutionId === updatedFunding.institutionId,
      );

      if (chapterFundings.length === 0) return;
      await updateFunding({ ...chapterFundings[0], program: updatedFunding.program }, chapter.id);
    });

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, program: updatedFunding.program };
    });

    setFundings(updatedFundings);
  };

  const updateGrantNumber = async (updatedFunding: FundingEntity) => {
    const fundingsToUpdate = fundings.filter(
      (funding) =>
        funding.grantNumber !== updatedFunding.grantNumber &&
        funding.program === updatedFunding.program &&
        funding.projectName === updatedFunding.projectName &&
        funding.projectShortname === updatedFunding.projectShortname &&
        funding.jurisdiction === updatedFunding.jurisdiction &&
        funding.institutionId === updatedFunding.institutionId,
    );

    if (fundingsToUpdate.length === 0) return;

    const fundingsIds = fundingsToUpdate.map((funding) => funding.id);

    chapters.forEach(async (chapter) => {
      const chapterFundings = chapter.fundings.filter(
        (funding) =>
          funding.projectName === updatedFunding.projectName &&
          funding.grantNumber !== updatedFunding.grantNumber &&
          funding.program === updatedFunding.program &&
          funding.projectShortname === updatedFunding.projectShortname &&
          funding.jurisdiction === updatedFunding.jurisdiction &&
          funding.institutionId === updatedFunding.institutionId,
      );

      if (chapterFundings.length === 0) return;
      await updateFunding({ ...chapterFundings[0], grantNumber: updatedFunding.grantNumber }, chapter.id);
    });

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, grantNumber: updatedFunding.grantNumber };
    });

    setFundings(updatedFundings);
  };

  const updateInstitution = async (updatedFunding: FundingEntity) => {
    const fundingsToUpdate = fundings.filter(
      (funding) =>
        funding.grantNumber === updatedFunding.grantNumber &&
        funding.program === updatedFunding.program &&
        funding.projectName === updatedFunding.projectName &&
        funding.projectShortname === updatedFunding.projectShortname &&
        funding.jurisdiction === updatedFunding.jurisdiction &&
        funding.institutionId !== updatedFunding.institutionId,
    );

    if (fundingsToUpdate.length === 0) return;

    const fundingsIds = fundingsToUpdate.map((funding) => funding.id);

    chapters.forEach(async (chapter) => {
      const chapterFundings = chapter.fundings.filter(
        (funding) =>
          funding.projectName === updatedFunding.projectName &&
          funding.grantNumber === updatedFunding.grantNumber &&
          funding.program === updatedFunding.program &&
          funding.projectShortname === updatedFunding.projectShortname &&
          funding.jurisdiction === updatedFunding.jurisdiction &&
          funding.institutionId !== updatedFunding.institutionId,
      );

      if (chapterFundings.length === 0) return;
      await updateFunding(
        {
          ...chapterFundings[0],
          institutionId: updatedFunding.institutionId,
          institutionName: updatedFunding.institutionName,
        },
        chapter.id,
      );
    });

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return {
        ...funding,
        institutionId: updatedFunding.institutionId,
        institutionName: updatedFunding.institutionName,
      };
    });

    setFundings(updatedFundings);
  };

  const editFunding = (id: string) => {
    if (activeFunding) close();

    const funding = chapters.flatMap((chapter) => chapter.fundings).find((funding) => funding.id === id);

    if (!funding) return;

    edit({ ...funding });
  };

  const deleteChapterFundings = async (id: string) => {
    const funding = fundings.find((funding) => funding.id === id);

    const ids: FundingId[] = [];

    chapters.forEach(({ fundings }) => {
      fundings.forEach((funding) => {
        if (
          funding.institutionId === funding.institutionId &&
          funding.grantNumber === funding.grantNumber &&
          funding.program === funding.program &&
          funding.projectName === funding.projectName &&
          funding.projectShortname === funding.projectShortname &&
          funding.jurisdiction === funding.jurisdiction
        ) {
          ids.push(funding.id);
        }
      });
    });

    const updatedFundings = fundings.filter((funding) => funding.id !== id);

    await deleteFundings(ids);

    setFundings(updatedFundings);
  };

  return (
    <RecommendedSection title="Fundings" isEmpty={true} isValid={false}>
      {({ showRecommendations }) => (
        <>
          {isSectionEnabled ? (
            <FundingsTable
              activeFunding={activeFunding}
              fundings={fundings}
              showRecommendations={showRecommendations}
              onEdit={editFunding}
              onDelete={deleteChapterFundings}
              form={
                <EditFunding
                  workId=""
                  queryToken={queryToken}
                  onProjectUpdate={updateProject}
                  onProjectShortNameUpdate={updateProjectShortName}
                  onJurisdictionUpdate={updateJurisdiction}
                  onProgramUpdate={updateProgram}
                  onGrantNumberUpdate={updateGrantNumber}
                  onInstitutionUpdate={updateInstitution}
                />
              }
            />
          ) : (
            <Typography className="pl-4">
              This section is unavailable because the fundings in selected chapters are not the same. Please check the
              fundings and try again.
            </Typography>
          )}
          {isNewFunding && <AddFunding workId="" queryToken={queryToken} onCreate={createFunding} />}
          <AddButton className="px-7 capitalize" onAdd={addFunding} disabled={isNewFunding}>
            {t('add funding')}
          </AddButton>
        </>
      )}
    </RecommendedSection>
  );
};

export default EditChaptersFundings;
