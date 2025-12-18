'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAffiliationsForm, useMoveAffiliation } from '@/src/entities/affiliation';
import type { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import { useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
  WorkContribution,
} from '@/src/entities/contribution/model/contribution.types';
import { useLinkedPublishers, useUpdateContributor } from '@/src/entities/contributor';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useWork } from '@/src/entities/work';
import { type BaseEditSectionProps, NOTIFICATIONS, removePrefix } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

type UseEditContributionProps = BaseEditSectionProps &
  Partial<{
    isAdmin: boolean;
    linkedPublishers: PublisherId[];
    onNamesUpdate: (data: ContributionNamesForm) => void;
    onTypeUpdate: (data: ContributionTypeForm) => void;
    onBiographyUpdate: (data: ContributionBiographyForm) => void;
    onOrcidUpdate: (data: OrcidForm) => void;
    onWebsiteUrlUpdate: (data: WebsiteUrlForm) => void;
    onAffiliationsUpdate: (data: AffiliationsForm) => void;
    onDeleteAffiliation: (id: string) => void;
    onMoveAffiliation: (data: AffiliationsForm['affiliations']) => void;
  }>;

export const useEditContribution = (props: UseEditContributionProps) => {
  const {
    workId,
    isAdmin = false,
    linkedPublishers = [],
    onNamesUpdate,
    onTypeUpdate,
    // onBiographyUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onAffiliationsUpdate,
    onDeleteAffiliation,
    onMoveAffiliation,
  } = props;

  const { activeContribution, close } = useContributionStateMachine();
  const { close: closeForm } = useFormStateMachine();
  const [contribution, setContribution] = useState<WorkContribution | null>(activeContribution);

  const { moveAffiliation } = useMoveAffiliation({ workId });
  const { work, updateContribution: updateWorkContribution } = useWork(workId);
  const { sendErrorNotification } = useNotifications();
  const { updateContributor } = useUpdateContributor({
    onCompleted: (data) => {
      if (!contribution) return;

      setContribution({
        ...contribution,
        firstName: data.firstName ?? '',
        lastName: data.lastName,
        fullName: data.fullName,
        orcidId: removePrefix(data.orcid ?? ''),
        website: removePrefix(data.website ?? ''),
      });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? NOTIFICATIONS.CONTRIBUTOR_UPDATE_FAILED);
      close();
    },
  });

  const { contributedToPublishers } = useLinkedPublishers({ id: activeContribution?.contributorId });
  const { updateAffiliations, deleteAffiliation } = useAffiliationsForm({
    contributionId: contribution?.id || '',
    affiliations: contribution?.affiliations || [],
    workId,
  });

  useEffect(() => {
    const contribution = work?.contributions.find((contribution) => contribution.id === activeContribution?.id);

    if (!contribution) return;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setContribution(contribution);
  }, [work]);

  useEffect(() => {
    if (!activeContribution) return;

    setContribution(activeContribution);
  }, [activeContribution]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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

    if (onNamesUpdate) {
      onNamesUpdate({ fullName, firstName, lastName });
      setContribution({
        ...contribution,
        fullName,
        firstName,
        lastName,
      });
      return;
    }

    updateContribution({
      ...contribution,
      fullName,
      firstName,
      lastName,
    });
  };

  const updateType = ({ contributorType }: ContributionTypeForm) => {
    if (!contribution) return;

    if (onTypeUpdate) {
      onTypeUpdate({ contributorType });
      setContribution({
        ...contribution,
        type: contributorType,
      });
      return;
    }

    updateContribution({
      ...contribution,
      type: contributorType,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateBiography = ({ biographies }: ContributionBiographyForm) => {
    if (!contribution) return;

    // TODO: update the biographies
    // if (onBiographyUpdate) {
    //   onBiographyUpdate({ contributorBiography });
    //   setContribution({
    //     ...contribution,
    //     biography: contributorBiography,
    //   });
    //   return;
    // }

    // updateContribution({
    //   ...contribution,
    //   biography: contributorBiography,
    // });
  };

  const updateOrcid = ({ orcid = '' }: OrcidForm) => {
    if (!contribution || orcid.length === 0) return;

    if (onOrcidUpdate) {
      onOrcidUpdate({ orcid });
      setContribution({
        ...contribution,
        orcidId: orcid,
      });
      return;
    }

    updateContributor({
      id: contribution.contributorId,
      firstName: contribution.firstName,
      lastName: contribution.lastName,
      fullName: contribution.fullName,
      orcid,
      website: contribution.website,
      name: contribution.fullName,
      updatedAt: '',
      lastContributionTitle: '',
    });
  };

  const updateWebsiteUrl = ({ websiteUrl = '' }: WebsiteUrlForm) => {
    if (!contribution || websiteUrl.length === 0) return;

    if (onWebsiteUrlUpdate) {
      onWebsiteUrlUpdate({ websiteUrl });
      setContribution({
        ...contribution,
        website: websiteUrl,
      });
      return;
    }

    updateContributor({
      id: contribution.contributorId,
      firstName: contribution.firstName,
      lastName: contribution.lastName,
      fullName: contribution.fullName,
      orcid: contribution.orcidId,
      website: websiteUrl,
      name: contribution.fullName,
      updatedAt: '',
      lastContributionTitle: '',
    });
  };

  const updateContributionAffiliations = async (data: AffiliationsForm) => {
    if (onAffiliationsUpdate) {
      onAffiliationsUpdate(data);
      return;
    }

    await updateAffiliations(data);
  };

  const deleteContributionAffiliation = (id: string) => {
    if (onDeleteAffiliation) {
      onDeleteAffiliation(id);
      return;
    }

    deleteAffiliation(id);
  };

  const moveContributionAffiliation = (data: AffiliationsForm['affiliations']) => {
    if (!contribution) return;

    const updatedAffiliations = data.map(({ id, affiliation, position }, index) => ({
      id,
      affiliationId: id,
      affiliation,
      position,
      newOrdinal: index + 1,
    }));

    if (onMoveAffiliation) {
      onMoveAffiliation(updatedAffiliations);
      return;
    }

    const firstChange = updatedAffiliations.find(
      ({ position, affiliation: { value } }, index) =>
        position !== contribution.affiliations[index]?.position &&
        value !== contribution.affiliations[index]?.institutionId,
    );

    if (!firstChange) return;

    moveAffiliation({
      affiliationId: firstChange.id,
      newOrdinal: firstChange.newOrdinal,
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
    updateAffiliations: updateContributionAffiliations,
    deleteAffiliation: deleteContributionAffiliation,
    moveAffiliation: moveContributionAffiliation,
  };
};
