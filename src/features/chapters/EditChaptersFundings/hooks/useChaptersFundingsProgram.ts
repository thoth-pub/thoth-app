import { useUpdateFunding } from '@/src/entities/funding';
import type { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const useChaptersFundingsProgram = ({
  chapters,
  fundings,
}: {
  chapters: WorkEntity[];
  fundings: FundingEntity[];
}) => {
  const { updateFunding } = useUpdateFunding({ workId: '' });

  const updatePrograms = async (updatedFunding: FundingEntity) => {
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

    const promises: Promise<void>[] = [];

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

      promises.push(updateFunding({ ...chapterFundings[0], program: updatedFunding.program }, chapter.id));
    });

    await Promise.all(promises);

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, program: updatedFunding.program };
    });

    return updatedFundings;
  };

  return { updatePrograms };
};
