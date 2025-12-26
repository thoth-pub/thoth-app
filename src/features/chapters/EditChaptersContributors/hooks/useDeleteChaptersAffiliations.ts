import { AffiliationEntity } from '@/src/entities/affiliation';
import useEditContributionAffiliations from '@/src/entities/affiliation/ui/useAffiliationsForm';
import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';

import { findAllSameContributions } from '../components/utils';

type UseDeleteChaptersAffiliationsProps = {
  affiliations: AffiliationEntity[];
};

export const useDeleteChaptersAffiliations = (props: UseDeleteChaptersAffiliationsProps) => {
  const { affiliations } = props;

  const { deleteBulkAffiliations } = useEditContributionAffiliations({
    contributionId: '',
    affiliations,
  });

  const deleteChaptersAffiliations = async ({
    id,
    contributionId,
    chapters,
    contributions,
    affiliations,
    uniqueContributors,
  }: {
    id: string;
    contributionId: ContributionId;
    chapters: WorkEntity[];
    contributions: WorkContribution[];
    affiliations: AffiliationEntity[];
    uniqueContributors: WorkContribution[];
  }) => {
    const sameContributions = findAllSameContributions(contributionId, chapters, contributions);

    if (sameContributions.length === 0) return { updatedUniqueContributions: [], deletedIds: [] };

    const relatedAffiliation = affiliations.find((affiliation) => affiliation.id === id);

    if (!relatedAffiliation) return { updatedUniqueContributions: [], deletedIds: [] };

    const affiliationsToDelete = sameContributions
      .map((contribution) =>
        contribution.affiliations.find(
          (affiliation) =>
            affiliation.institutionId === relatedAffiliation.institutionId &&
            affiliation.orderNumber === relatedAffiliation.orderNumber &&
            affiliation.position === relatedAffiliation.position,
        ),
      )
      .filter((affiliation) => affiliation !== undefined);

    const ids = affiliationsToDelete.map((affiliation) => affiliation.id);

    if (ids.length === 0) return { updatedUniqueContributions: [], deletedIds: [] };

    await deleteBulkAffiliations(ids);

    const updatedUniqueContributions = uniqueContributors.map((contribution) => {
      if (!ids.includes(contribution.id)) return contribution;

      return {
        ...contribution,
        affiliations: contribution.affiliations.filter((affiliation) => !ids.includes(affiliation.id)),
      };
    });

    return { updatedUniqueContributions, deletedIds: ids };
  };

  return {
    deleteChaptersAffiliations,
  };
};
