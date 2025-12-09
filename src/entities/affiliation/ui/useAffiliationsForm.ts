'use client';

import { useQueryClient } from '@tanstack/react-query';

import { useCreateAffiliation, useDeleteAffiliation, useUpdateAffiliation } from '@/src/entities/affiliation';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig, getDefaultAffiliation, isDefaultId, QueryKeys, type QueryToken } from '@/src/shared';

import type { AffiliationEntity, AffiliationsForm } from '../model/affiliation.types';

type UseEditContributionAffiliationsProps = {
  queryToken: QueryToken;
  contributionId: ContributionId;
  affiliations: AffiliationEntity[];
  workId?: WorkId;
};

const useEditContributionAffiliations = (props: UseEditContributionAffiliationsProps) => {
  const { queryToken, contributionId, affiliations } = props;

  const { createAffiliation } = useCreateAffiliation({
    queryToken,
  });
  const { updateAffiliation } = useUpdateAffiliation({
    queryToken,
  });
  const { deleteAffiliation } = useDeleteAffiliation({
    queryToken,
  });
  const queryClient = useQueryClient();

  const updateAffiliations = async (data: AffiliationsForm, id = contributionId) => {
    const newAffilations = data.affiliations.filter((affiliation) => isDefaultId(affiliation.id));
    const existingAffilations = data.affiliations.filter((affiliation) => !isDefaultId(affiliation.id));
    const affiliationsCount = affiliations.length;

    const newAffiliationsPromises = newAffilations.map(async ({ affiliation: { value }, position }, index) => {
      return createAffiliation(
        getDefaultAffiliation({
          contributionId: id,
          institutionId: value,
          orderNumber: affiliationsCount + 1 + index,
          position: position && position.length > 0 ? position : '',
        }),
      );
    });

    await Promise.all(newAffiliationsPromises);

    const existingAffiliationsPromises = existingAffilations.map(async ({ id, affiliation: { value }, position }) => {
      const affiliation = affiliations.find((affiliation) => affiliation.id === id);

      if (!affiliation) return;

      const updatedAffiliation = getDefaultAffiliation({
        ...affiliation,
        institutionId: value,
        position: position && position.length > 0 ? position : '',
      });

      return updateAffiliation(updatedAffiliation);
    });

    await Promise.all(existingAffiliationsPromises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
  };

  const deleteContributionAffiliation = (id: string) => {
    deleteAffiliation(id);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
  };

  const deleteBulkAffiliations = async (ids: string[]) => {
    const promises = ids.map((id) => {
      return deleteAffiliation(id);
    });
    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
  };

  const updateBulkAffiliations = async (data: AffiliationsForm, contributionIds: ContributionId[]) => {
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
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
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
