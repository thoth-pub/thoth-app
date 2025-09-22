'use client';

import { type ContributorEntity, useCreateContributor, useUpdateContributor } from '@/src/entities/contributor';
import useContributor from '@/src/entities/contributor/api/hooks/useLinkedPublishers';
import { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { ContributorForm } from '@/src/entities/contributor/model/contributor.validation';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { config, QueryToken } from '@/src/shared';
import { NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';

const { CONTRIBUTOR_CREATION_SUCCESS, CONTRIBUTOR_CREATION_FAILED, CONTRIBUTOR_UPDATE_FAILED } = NOTIFICATIONS;

type EditContributorProfileProps = {
  queryToken: QueryToken;
  workId: WorkId;
  contributorId?: ContributorId;
  onContributorCreated?: (data: ContributorEntity) => void;
  onContributorUpdated?: (data: ContributorEntity) => void;
};

export const useEditContributorProfile = (props: EditContributorProfileProps) => {
  const {
    queryToken,
    workId,
    contributorId = '',
    onContributorCreated,
    onContributorUpdated,
  } = props;

  const { sendSuccessNotification, sendErrorNotification } = useNotifications();
  const { contributedToPublishers } = useContributor({ id: contributorId });

  const { createContributor, toEntity } = useCreateContributor({
    queryToken,
    onCompleted: (data) => {
      const contributor = toEntity(data);
      onContributorCreated?.(contributor);
      sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);
    },
    onError: () => sendErrorNotification(CONTRIBUTOR_CREATION_FAILED),
  });
  const { updateContributor } = useUpdateContributor({
    queryToken,
    workId,
    onCompleted: (data) => {
      const contributor = toEntity(data);

      onContributorUpdated?.(contributor);
    },
    onError: () => sendErrorNotification(CONTRIBUTOR_UPDATE_FAILED),
  });

  const handleCreate = ({ firstName, lastName, fullName, orcid, websiteUrl }: ContributorForm) => {
    const createContributorData = {
      firstName: firstName && firstName !== '' ? firstName : null,
      lastName,
      fullName,
      orcid: orcid && orcid.length > 0 ? config.validations.orcidPrefix + orcid : null,
      website: websiteUrl && websiteUrl.length > 0 ? websiteUrl : null,
    };

    createContributor({ variables: { data: createContributorData } });
  };

  const handleUpdateProfile = ({
    firstName,
    lastName,
    fullName,
    orcid,
    websiteUrl,
    id,
  }: ContributorForm & { id: ContributorId }) => {
    const updatedContributorData = {
      firstName: firstName && firstName !== '' ? firstName : null,
      lastName,
      fullName,
      orcid: orcid && orcid.length > 0 ? config.validations.orcidPrefix + orcid : null,
      website: websiteUrl && websiteUrl.length > 0 ? websiteUrl : null,
      contributorId: id,
    };

    updateContributor({
      variables: { data: { ...updatedContributorData } },
    });
  };

  return {
    contributedToPublishers,
    createProfile: handleCreate,
    updateProfile: handleUpdateProfile,
  };
};
