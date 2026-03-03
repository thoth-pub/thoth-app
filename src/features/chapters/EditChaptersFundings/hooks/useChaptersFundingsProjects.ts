import { useUpdateFunding } from '@/src/entities/funding';
import { FundingEntity } from '@/src/entities/funding/model/funding.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

export const useChaptersFundingsProjects = ({
  chapters,
  fundings,
}: {
  chapters: WorkEntity[];
  fundings: FundingEntity[];
}) => {
  const { updateFunding } = useUpdateFunding({ workId: '' });

  const updateProjects = async (updatedFunding: FundingEntity) => {
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

    const promises: Promise<void>[] = [];

    chapters.forEach((chapter) => {
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
      promises.push(updateFunding({ ...chapterFundings[0], projectName: updatedFunding.projectName }, chapter.id));
    });

    await Promise.all(promises);

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, projectName: updatedFunding.projectName };
    });

    return updatedFundings;
  };

  const updateProjectsShortName = async (updatedFunding: FundingEntity) => {
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

    const promises: Promise<void>[] = [];

    chapters.forEach((chapter) => {
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
      promises.push(
        updateFunding({ ...chapterFundings[0], projectShortname: updatedFunding.projectShortname }, chapter.id),
      );
    });

    await Promise.all(promises);

    const updatedFundings = fundingsToUpdate.map((funding) => {
      if (!fundingsIds.includes(funding.id)) {
        return funding;
      }

      return { ...funding, projectShortname: updatedFunding.projectShortname };
    });

    return updatedFundings;
  };

  return { updateProjects, updateProjectsShortName };
};
