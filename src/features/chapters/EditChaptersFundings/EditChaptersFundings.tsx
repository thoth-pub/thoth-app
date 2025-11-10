'use client';

import { FundingsTable, useFundingsStateMachine } from '@/src/entities/funding';
import { FundingEntity } from '@/src/entities/funding/model/funding.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection, Typography } from '@/src/shared/ui';
import { useMemo } from 'react';

type EditChaptersFundingsProps = Omit<BaseEditSectionProps, 'workId'> & {
  chapters: WorkEntity[];
};

const EditChaptersFundings = (props: EditChaptersFundingsProps) => {
  const { queryToken, chapters } = props;

  const { activeFunding, edit } = useFundingsStateMachine();

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

  return (
    <RecommendedSection title="Fundings" isEmpty={true} isValid={false}>
      {({ showRecommendations }) => (
        <>
          {isSectionEnabled ? (
            <FundingsTable
              activeFunding={activeFunding}
              fundings={uniqueFundings}
              showRecommendations={showRecommendations}
            />
          ) : (
            <Typography className="pl-4">
              This section is unavailable because the fundings in selected chapters are not the same. Please check the
              fundings and try again.
            </Typography>
          )}
        </>
      )}
    </RecommendedSection>
  );
};

export default EditChaptersFundings;
