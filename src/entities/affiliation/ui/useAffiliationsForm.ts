import { useCreateAffiliation, useDeleteAffiliation, useUpdateAffiliation } from '@/src/entities/affiliation';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkAffiliation, WorkId } from '@/src/entities/work/model/work.types';
import { isDefaultId, type QueryToken } from '@/src/shared';

import type { AffiliationsForm } from '../model/affiliation.types';

type UseEditContributionAffiliationsProps = {
  queryToken: QueryToken;
  contributionId: ContributionId;
  affiliations: WorkAffiliation[];
  workId?: WorkId;
};

const useEditContributionAffiliations = (props: UseEditContributionAffiliationsProps) => {
  const { queryToken, contributionId, affiliations, workId = '' } = props;

  const { createAffiliation } = useCreateAffiliation({
    queryToken,
    workId,
  });
  const { updateAffiliation } = useUpdateAffiliation({
    queryToken,
    workId,
  });
  const { deleteAffiliation } = useDeleteAffiliation({
    queryToken,
    workId,
  });

  const updateAffiliations = async (data: AffiliationsForm) => {
    const newAffilations = data.affiliations.filter((affiliation) => isDefaultId(affiliation.id));
    const existingAffilations = data.affiliations.filter((affiliation) => !isDefaultId(affiliation.id));
    const affiliationsCount = affiliations.length;

    newAffilations.forEach(async ({ affiliation: { value }, position }, index) => {
      await createAffiliation({
        variables: {
          data: {
            contributionId,
            institutionId: value,
            affiliationOrdinal: affiliationsCount + 1 + index,
            position: position && position.length > 0 ? position : null,
          },
        },
      });
    });

    existingAffilations.forEach(async ({ id, affiliation: { value }, position }) => {
      const affiliation = affiliations.find((affiliation) => affiliation.id === id);

      if (!affiliation) return;

      await updateAffiliation({
        variables: {
          data: {
            affiliationId: id,
            institutionId: value,
            contributionId,
            position: position && position.length > 0 ? position : null,
            affiliationOrdinal: affiliation.orderNumber,
          },
        },
      });
    });
  };

  const deleteContributionAffiliation = (id: string) => {
    deleteAffiliation({
      variables: {
        affiliationId: id,
      },
    });
  };

  return {
    createAffiliation,
    updateAffiliations,
    deleteAffiliation: deleteContributionAffiliation,
  };
};

export default useEditContributionAffiliations;
