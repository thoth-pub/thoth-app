'use client';

import { useMemo, useState } from 'react';

import type { ContributionType, ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import type { PublisherId } from '@/src/entities/publisher';
import { useWork } from '@/src/entities/work';
import type { WorkContribution, WorkId } from '@/src/entities/work/model/work.types';
import { config, isDefaultId, type QueryToken } from '@/src/shared';
import { ContributorTypes } from '@/src/shared/constants';

import { useEditContributorProfile } from './useEditContributorProfile';

type EditWorkContributorsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  linkedPublishers?: PublisherId[];
  isAdmin?: boolean;
};

export const useEditWorkContributors = (props: EditWorkContributorsProps) => {
  const { workId, queryToken, isAdmin, linkedPublishers = [] } = props;

  const { work, createContribution, deleteContribution, updateContribution, contributionToDto } = useWork(
    workId,
    queryToken,
  );

  const [selectedContributor, setSelectedContributor] = useState<WorkContribution | null>(null);
  const isRecentlyAddedContribution = selectedContributor ? isDefaultId(selectedContributor.id) : false;

  const contributions = useMemo(() => {
    if (!selectedContributor || !isRecentlyAddedContribution) return work.contributions;

    return [...work.contributions, selectedContributor];
  }, [work.contributions, selectedContributor]);

  const { contributedToPublishers, createProfile, updateProfile } = useEditContributorProfile({
    queryToken,
    workId,
    contributorId: selectedContributor?.contributorId ?? '',
    onContributorCreated: (contributor) => {
      createContribution({
        variables: {
          data: {
            workId,
            contributorId: contributor.id,
            contributionType: selectedContributor?.type ?? ContributorTypes.enum.Author,
            mainContribution: true,
            lastName: contributor.lastName ?? '',
            fullName: contributor.fullName ?? '',
            contributionOrdinal: contributions.length + 1,
          },
        },
      });
      setSelectedContributor(null);
    },
  });

  const isContributedOnlyToCurrentPublisher = useMemo(() => {
    const contributions = Array.from(new Set(contributedToPublishers));

    return contributions.every((contribution) => linkedPublishers.includes(contribution));
  }, [contributedToPublishers, workId]);

  const isOrchidFieldDisabled = !!selectedContributor?.orchidId && !isAdmin && !isContributedOnlyToCurrentPublisher;
  const isWebsiteUrlFieldDisabled = !!selectedContributor?.website && !isAdmin && !isContributedOnlyToCurrentPublisher;

  const preselectContributor = (
    contributor: Partial<{ fullName: string; lastName: string; contributorId: string }>,
  ) => {
    const id = config.defaultId;

    const newContribution = {
      ...contributor,
      id,
      type: ContributorTypes.enum.Author,
      isMain: false,
      orderNumber: 0,
      biography: '',
      orchidId: '',
      website: '',
      firstName: '',
      affiliations: [],
      fullName: contributor.fullName ?? 'Full Name',
      lastName: contributor.lastName ?? 'Last Name',
      contributorId: contributor.contributorId ?? id,
    };
    setSelectedContributor(newContribution);
  };

  const saveContribution = async () => {
    if (!selectedContributor) return;

    if (!isRecentlyAddedContribution) {
      setSelectedContributor(null);
      return;
    }

    const { lastName, fullName, firstName, orchidId, website } = selectedContributor;

    createProfile({
      lastName,
      fullName,
      firstName,
      orcid: orchidId,
      websiteUrl: website,
    });
  };

  const handleDataUpdateContribution = (updatedData: Partial<WorkContribution>) => {
    if (!selectedContributor) return;

    setSelectedContributor({
      ...selectedContributor,
      ...updatedData,
    });

    if (isRecentlyAddedContribution) return;

    const data = contributionToDto({
      ...selectedContributor,
      ...updatedData,
    });

    updateContribution({
      variables: {
        data: {
          workId,
          ...data,
        },
      },
    });
  };

  const updateContributionFullName = (fullName: string) => {
    handleDataUpdateContribution({ fullName });
  };

  const updateContributionLastName = (lastName: string) => {
    handleDataUpdateContribution({ lastName });
  };

  const updateContributionType = (contributorType: ContributionType) => {
    handleDataUpdateContribution({ type: contributorType });
  };

  const deleteWorkContribution = async (id: string) => {
    const index = contributions.findIndex((contribution) => contribution.id === id);

    if (index < 0) return;

    const changedItems = contributions.slice(index + 1).map((contribution) => ({
      ...contribution,
      orderNumber: contribution.orderNumber - 1,
    }));

    await deleteContribution({
      variables: {
        contributionId: id,
      },
    });

    changedItems.forEach(async (contribution) => {
      const data = contributionToDto(contribution);

      await updateContribution({
        variables: {
          data: {
            workId,
            ...data,
          },
        },
      });
    });
  };

  const updateContributionAsMain = (id: string) => {
    const contributor = contributions.find((contribution) => contribution.id === id);

    if (!contributor) return;

    const data = contributionToDto({
      ...contributor,
      isMain: !contributor.isMain,
    });

    updateContribution({
      variables: {
        data: {
          workId,
          ...data,
        },
      },
    });
  };

  const reorderContributions = async (items: WorkContribution[]) => {
    const reorderedItems = items.map((item, index) => ({
      ...item,
      orderNumber: index + 1,
    }));

    const changedItems = reorderedItems.filter(({ id, orderNumber }) => {
      const previousItem = contributions.find((contribution) => contribution.id === id);

      return previousItem?.orderNumber !== orderNumber;
    });

    changedItems.forEach(async (contribution) => {
      const { contributorId, contributionType, mainContribution, biography, fullName, lastName } =
        contributionToDto(contribution);

      const existingContribution = contributions[contribution.orderNumber - 1];

      if (!existingContribution) return;

      await updateContribution({
        variables: {
          data: {
            workId,
            contributionId: existingContribution.id,
            contributorId,
            contributionType,
            mainContribution,
            biography,
            fullName,
            lastName,
            contributionOrdinal: existingContribution.orderNumber,
          },
        },
      });
    });
  };

  const handleUpdateContributorProfile = (updatedData: Partial<ContributorEntity>) => {
    if (!selectedContributor) return;

    setSelectedContributor({
      ...selectedContributor,
      orchidId: updatedData.orcid ?? '',
      website: updatedData.website ?? '',
    });

    if (isRecentlyAddedContribution) return;

    const dataForProfile = {
      id: selectedContributor.contributorId,
      lastName: selectedContributor.lastName ?? '',
      fullName: selectedContributor.fullName ?? '',
      firstName: selectedContributor.firstName ?? '',
      orcid: updatedData.orcid ?? selectedContributor.orchidId,
      websiteUrl: updatedData.website ?? selectedContributor.website,
    };

    updateProfile({
      ...dataForProfile,
    });
  };

  const updateContributionOrcid = (orcid: string) => {
    if (isOrchidFieldDisabled) return;

    handleUpdateContributorProfile({ orcid });
  };

  const updateContributionWebsite = (website: string) => {
    if (isWebsiteUrlFieldDisabled) return;

    handleUpdateContributorProfile({ website });
  };

  const handleEdit = (id: string) => {
    const contributor = contributions.find((contribution) => contribution.id === id);

    if (!contributor) return;

    setSelectedContributor(contributor);
  };

  return {
    contributions,
    selectedContributor,
    isOrchidFieldDisabled,
    isWebsiteUrlFieldDisabled,
    preselectContributor,

    deleteContribution: deleteWorkContribution,
    reorderContributions,
    updateContributionAsMain,
    updateContributionFullName,
    updateContributionLastName,
    updateContributionType,
    updateContributionOrcid,
    updateContributionWebsite,
    saveContribution,

    edit: handleEdit,
  };
};
