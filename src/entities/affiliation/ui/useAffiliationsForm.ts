import { useCreateAffiliation, useDeleteAffiliation, useUpdateAffiliation } from '@/src/entities/affiliation';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig, isDefaultId, type QueryToken } from '@/src/shared';

import type { AffiliationEntity, AffiliationsForm } from '../model/affiliation.types';

type UseEditContributionAffiliationsProps = {
  queryToken: QueryToken;
  contributionId: ContributionId;
  affiliations: AffiliationEntity[];
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

  const updateAffiliations = async (data: AffiliationsForm, id = contributionId) => {
    const newAffilations = data.affiliations.filter((affiliation) => isDefaultId(affiliation.id));
    const existingAffilations = data.affiliations.filter((affiliation) => !isDefaultId(affiliation.id));
    const affiliationsCount = affiliations.length;

    newAffilations.forEach(async ({ affiliation: { value }, position }, index) => {
      await createAffiliation({
        variables: {
          data: {
            contributionId: id,
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
            affiliationId: affiliation.id,
            institutionId: value,
            contributionId: affiliation.contributionId,
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

  const deleteBulkAffiliations = async (ids: string[]) => {
    const promises = ids.map((id) => {
      return deleteAffiliation({
        variables: {
          affiliationId: id,
        },
      });
    });

    await Promise.all(promises);
  };

  const updateBulkAffiliations = async (
    data: AffiliationsForm,
    contributionIds: ContributionId[],
    initialAffilations: AffiliationEntity[],
  ) => {
    const allAffiliationsAsNew = data.affiliations.map((affiliation) => ({
      ...affiliation,
      id: appConfig.defaultId,
    }));

    const allActiveAffiliations = affiliations.filter((affiliation) =>
      contributionIds.includes(affiliation.contributionId),
    );

    const activeIds = allActiveAffiliations.map((affiliation) => affiliation.id);

    const promises = [
      deleteBulkAffiliations(activeIds),
      contributionIds.map((contributionId) =>
        updateAffiliations({ affiliations: allAffiliationsAsNew }, contributionId),
      ),
    ];

    await Promise.all(promises);
  };

  return {
    createAffiliation,
    updateAffiliations,
    updateBulkAffiliations,
    deleteAffiliation: deleteContributionAffiliation,
    deleteBulkAffiliations,
  };
};

export default useEditContributionAffiliations;
