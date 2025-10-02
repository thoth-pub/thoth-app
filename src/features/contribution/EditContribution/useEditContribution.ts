'use client';

import { useMemo, useState } from 'react';

import { useAffiliationsForm } from '@/src/entities/affiliation';
import { useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
} from '@/src/entities/contribution/model/contribution.types';
import { useLinkedPublishers, useUpdateContributor } from '@/src/entities/contributor';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useWork } from '@/src/entities/work';
import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { appConfig, type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

type UseEditContributionProps = BaseEditSectionProps & {
  isAdmin?: boolean;
  linkedPublishers?: PublisherId[];
};

const { protocolPrefix, orcidPrefix } = appConfig.validations;

export const useEditContribution = (props: UseEditContributionProps) => {
  const { workId, queryToken, isAdmin = false, linkedPublishers = [] } = props;

  const { activeContribution, close } = useContributionStateMachine();
  const { close: closeForm } = useFormStateMachine();
  const [contribution, setContribution] = useState<WorkContribution | null>(activeContribution);

  const { updateContribution: updateWorkContribution } = useWork(workId, queryToken);
  const { sendErrorNotification } = useNotifications();
  const { updateContributor } = useUpdateContributor({
    queryToken,
    workId,
    contributorId: contribution?.contributorId,
    onCompleted: (data) => {
      if (!contribution) return;

      setContribution({
        ...contribution,
        firstName: data.firstName ?? '',
        lastName: data.lastName,
        fullName: data.fullName,
        orcidId: data.orcid?.replace(orcidPrefix, ''),
        website: data.website?.replace(protocolPrefix, '') ?? '',
      });
    },
    onError: () => {
      sendErrorNotification(NOTIFICATIONS.CONTRIBUTOR_UPDATE_FAILED);
      close();
    },
  });

  const { contributedToPublishers } = useLinkedPublishers({ id: activeContribution?.contributorId });

  const { updateAffiliations, deleteAffiliation } = useAffiliationsForm({
    queryToken,
    contributionId: contribution?.id || '',
    affiliations: contribution?.affiliations || [],
    workId,
  });

  const isContributedOnlyToCurrentPublisher = useMemo(() => {
    const contributions = Array.from(new Set(contributedToPublishers));

    return contributions.every((contribution) => linkedPublishers.includes(contribution));
  }, [contributedToPublishers, workId]);

  const isOrchidEditionDisabled = !!activeContribution?.orcidId && !isAdmin && !isContributedOnlyToCurrentPublisher;
  const isWebsiteUrlEditionDisabled = !!activeContribution?.website && !isAdmin && !isContributedOnlyToCurrentPublisher;

  const updateContribution = (data: WorkContribution) => {
    setContribution(data);
    updateWorkContribution(data);
    closeForm();
  };

  const updateNames = ({ fullName, firstName = '', lastName }: ContributionNamesForm) => {
    if (!contribution) return;

    updateContribution({
      ...contribution,
      fullName,
      firstName,
      lastName,
    });
  };

  const updateType = ({ contributorType }: ContributionTypeForm) => {
    if (!contribution) return;

    updateContribution({
      ...contribution,
      type: contributorType,
    });
  };

  const updateBiography = ({ contributorBiography = '' }: ContributionBiographyForm) => {
    if (!contribution) return;

    updateContribution({
      ...contribution,
      biography: contributorBiography,
    });
  };

  const updateOrcid = ({ orcid = '' }: OrcidForm) => {
    if (!contribution || orcid.length === 0) return;

    updateContributor({
      id: contribution.contributorId,
      firstName: contribution.firstName,
      lastName: contribution.lastName,
      fullName: contribution.fullName,
      orcid,
      website: contribution.website,
    });
  };

  const updateWebsiteUrl = ({ websiteUrl = '' }: WebsiteUrlForm) => {
    if (!contribution || websiteUrl.length === 0) return;

    updateContributor({
      id: contribution.contributorId,
      firstName: contribution.firstName,
      lastName: contribution.lastName,
      fullName: contribution.fullName,
      orcid: contribution.orcidId,
      website: websiteUrl,
    });
  };

  return {
    contribution,
    isOrchidEditionDisabled,
    isWebsiteUrlEditionDisabled,
    close,
    updateNames,
    updateType,
    updateBiography,
    updateOrcid,
    updateWebsiteUrl,
    updateAffiliations,
    deleteAffiliation,
  };
};
