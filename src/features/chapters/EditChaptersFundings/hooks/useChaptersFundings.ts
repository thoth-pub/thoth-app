import { useDeleteFunding } from '@/src/entities/funding';
import type { FundingEntity, FundingId } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const useChaptersFundings = (chapters: WorkEntity[]) => {
  const uniqueFundings: FundingEntity[] = [];

  const { deleteFundings: deleteFundingsMutation } = useDeleteFunding();

  chapters.forEach(({ fundings: chapterFundings }) => {
    chapterFundings.forEach((funding) => {
      const isAlreadyExists = uniqueFundings.some(
        (f) =>
          f.institutionId === funding.institutionId &&
          f.grantNumber === funding.grantNumber &&
          f.program === funding.program &&
          f.projectName === funding.projectName,
      );

      if (isAlreadyExists) return;

      uniqueFundings.push(funding);
    });
  });

  const deleteFundings = async (id: FundingId) => {
    const ids: FundingId[] = [];

    const fundings = chapters.flatMap(({ fundings }) => fundings);
    const foundFunding = fundings.find((funding) => funding.id === id);

    if (!foundFunding) return;

    chapters.forEach(({ fundings: chapterFundings }) => {
      chapterFundings.forEach((funding) => {
        const isSameInstitution = funding.institutionId === foundFunding.institutionId;
        const isSameGrantNumber = funding.grantNumber === foundFunding.grantNumber;
        const isSameProgram = funding.program === foundFunding.program;
        const isSameProjectName = funding.projectName === foundFunding.projectName;
        const isSameProjectShortname = funding.projectShortname === foundFunding.projectShortname;
        const isSameJurisdiction = funding.jurisdiction === foundFunding.jurisdiction;

        const isSameFunding =
          isSameInstitution &&
          isSameGrantNumber &&
          isSameProgram &&
          isSameProjectName &&
          isSameProjectShortname &&
          isSameJurisdiction;

        if (!isSameFunding) return;

        ids.push(funding.id);
      });
    });

    await deleteFundingsMutation(ids);
  };

  return { uniqueFundings, deleteFundings };
};
