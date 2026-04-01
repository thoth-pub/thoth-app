import { useMoveBulkAffiliation } from '@/src/entities/affiliation';
import type { AffiliationEntity } from '@/src/entities/affiliation/model/affiliation.types';
import type { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { findAllSameContributions } from '../components/utils';

export const useChaptersAffiliationsOrderUpdate = () => {
  const { moveBulkAffiliation } = useMoveBulkAffiliation();

  const updateChaptersAffiliationsOrder = async ({
    data,
    chapters,
    uniqueContributors,
  }: {
    data: AffiliationsForm['affiliations'];
    chapters: WorkEntity[];
    uniqueContributors: WorkContribution[];
  }) => {
    const changedAffiliations = data.map((affiliation, index) => ({
      ...affiliation,
      newOrdinal: index + 1,
    }));

    const affiliationsIds = changedAffiliations.map((affiliation) => affiliation.affiliationId);

    const chapterWithAffiliations = chapters.find((chapter) => {
      const contributions = chapter.contributions;
      const contributionsWithAffiliations = contributions.filter((contribution) =>
        contribution.affiliations.every((affiliation) => affiliationsIds.includes(affiliation.id)),
      );

      return contributionsWithAffiliations.length === changedAffiliations.length;
    });

    if (!chapterWithAffiliations) return [];

    const existingContribution = chapterWithAffiliations.contributions.find(
      (contribution) =>
        contribution.affiliations.every((affiliation) => affiliationsIds.includes(affiliation.id)) &&
        contribution.affiliations.length === changedAffiliations.length,
    );

    if (!existingContribution) return [];

    const firstUpdatedAffiliation = changedAffiliations.find(
      (affiliation, index) =>
        affiliation.position !== existingContribution.affiliations[index].position ||
        affiliation.affiliation?.value !== existingContribution.affiliations[index].institutionId,
    );

    if (!firstUpdatedAffiliation) return [];

    const contributionsToUpdate = findAllSameContributions(existingContribution.id, chapters, uniqueContributors);
    const contributionsToUpdateIds = contributionsToUpdate.map((contribution) => contribution.id);

    const affiliationsToUpdate: AffiliationEntity[] = [];

    contributionsToUpdate.forEach((contribution) => {
      const foundedAffiliation = contribution.affiliations.find(
        (affiliation) =>
          affiliation.position === firstUpdatedAffiliation.position &&
          affiliation.institutionId === firstUpdatedAffiliation.affiliation?.value,
      );

      if (!foundedAffiliation) return [];

      affiliationsToUpdate.push(foundedAffiliation);
    });

    const dataForUpdate = affiliationsToUpdate.map((affiliation) => {
      return {
        affiliationId: affiliation.id,
        newOrdinal: firstUpdatedAffiliation.newOrdinal,
      };
    });

    await moveBulkAffiliation(dataForUpdate);

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (!contributionsToUpdateIds.includes(contribution.id)) return contribution;

      const affiliations: AffiliationEntity[] = changedAffiliations.map((affiliation) => {
        return {
          id: affiliation.affiliationId,
          institutionId: affiliation.affiliation?.value,
          institutionName: affiliation.affiliation?.label,
          rorId: affiliation.affiliation?.value,
          contributionId: contribution.id,
          orderNumber: affiliation.newOrdinal,
          position: affiliation.position || '',
        };
      });

      return {
        ...contribution,
        affiliations,
      };
    });

    return updatedUniqueContributions;
  };
  return {
    updateChaptersAffiliationsOrder,
  };
};
