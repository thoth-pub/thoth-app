'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useAffiliationsForm, useMoveAffiliation } from '@/src/entities/affiliation';
import type { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import {
  useContributionStateMachine,
  useCreateBiography,
  useDeleteBiography,
  useUpdateBiography,
} from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
  WorkContribution,
} from '@/src/entities/contribution/model/contribution.types';
import { useLinkedPublishers, useUpdateContributor } from '@/src/entities/contributor';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { useUser } from '@/src/entities/user';
import { useWork } from '@/src/entities/work';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useDefaultLocaleOption, useNotifications } from '@/src/shared/hooks';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { removePrefix } from '@/src/shared/utils';
import { computeBiographiesDiff } from '@/src/shared/utils/biographies';

type UseEditContributionProps = BaseEditSectionProps &
  Partial<{
    linkedPublishers: PublisherId[];
    onNamesUpdate: (data: ContributionNamesForm) => void;
    onTypeUpdate: (data: ContributionTypeForm) => void;
    onBiographiesUpdate: (data: ContributionBiographyForm) => void;
    onDeleteBiography: (id: string) => void;
    onOrcidUpdate: (data: OrcidForm) => void;
    onWebsiteUrlUpdate: (data: WebsiteUrlForm) => void;
    onAffiliationsUpdate: (data: AffiliationsForm) => void;
    onDeleteAffiliation: (id: string) => void;
    onMoveAffiliation: (data: AffiliationsForm['affiliations']) => void;
    onIsMainSubmit: (isMain: boolean) => void;
  }>;

const emptyLinkedPublishers: PublisherId[] = [];

export const useEditContribution = (props: UseEditContributionProps) => {
  const {
    workId,
    linkedPublishers = emptyLinkedPublishers,
    onNamesUpdate,
    onTypeUpdate,
    onBiographiesUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onAffiliationsUpdate,
    onDeleteAffiliation,
    onMoveAffiliation,
    onIsMainSubmit,
  } = props;

  const { activeEntity: activeContribution, finishEditing } = useContributionStateMachine();
  const { closeForm } = useFormStateMachine();
  const [contribution, setContribution] = useState(activeContribution);
  const { user } = useUser();
  const { moveAffiliation } = useMoveAffiliation({ workId });
  const { work, updateContribution: updateWorkContribution } = useWork(workId);
  const defaultLocaleOption = useDefaultLocaleOption(work.imprintId);
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
      finishEditing();
    },
  });
  const queryClient = useQueryClient();
  const { createBiography } = useCreateBiography();
  const { updateBiography: updateBiographyMutation } = useUpdateBiography(workId ?? '');
  const { deleteBiography } = useDeleteBiography();

  const { contributedToPublishers } = useLinkedPublishers({ id: activeContribution?.contributorId });
  const { updateAffiliations, deleteAffiliation } = useAffiliationsForm({
    contributionId: contribution?.id || '',
    affiliations: contribution?.affiliations || [],
    workId,
  });

  useEffect(() => {
    const contribution = work?.contributions.find((contribution) => contribution.id === activeContribution?.id);

    if (!contribution) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContribution(contribution);
  }, [work, activeContribution?.id]);

  useEffect(() => {
    if (!activeContribution) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContribution(activeContribution);
  }, [activeContribution]);

  const isContributedOnlyToCurrentPublisher = useMemo(() => {
    const contributions = Array.from(new Set(contributedToPublishers));

    return contributions.every((contribution) => linkedPublishers.includes(contribution));
  }, [contributedToPublishers, linkedPublishers]);

  const isOrchidEditionDisabled =
    !!activeContribution?.orcidId && !user.isSuperuser && !isContributedOnlyToCurrentPublisher;
  const isWebsiteUrlEditionDisabled =
    !!activeContribution?.website && !user.isSuperuser && !isContributedOnlyToCurrentPublisher;

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

  const updateBiography = async ({ biographies }: ContributionBiographyForm) => {
    if (!contribution) return;

    if (onBiographiesUpdate) {
      onBiographiesUpdate({ biographies });
      return;
    }

    const desiredBiographies = biographies
      .map(({ biographyId, contributorBiography, language }) => ({
        id: biographyId,
        canonical: false,
        content: contributorBiography ?? '',
        localeCode: language.value,
        contributionId: contribution.id,
      }))
      .filter((biography) => biography.content.length > 0);

    const { biographiesToDelete, updatedBiographies, newBiographies } = computeBiographiesDiff(
      desiredBiographies,
      contribution.biographies,
    );
    const hasBiographyMutations =
      biographiesToDelete.length + updatedBiographies.length + newBiographies.length > 0;
    let hasSuccessfulBiographyMutation = false;

    const runBiographyMutations = async (mutations: Promise<unknown>[]) => {
      const results = await Promise.allSettled(mutations);

      if (results.some(({ status }) => status === 'fulfilled')) {
        hasSuccessfulBiographyMutation = true;
      }

      const failedMutation = results.find((result) => result.status === 'rejected');

      if (failedMutation) throw failedMutation.reason;
    };

    // Deletions only remove content the user discarded, and must run first so a
    // replacement canonical biography does not clash with the deleted one.
    try {
      await runBiographyMutations(biographiesToDelete.map(({ id }) => deleteBiography(id)));
      await runBiographyMutations(
        updatedBiographies.map((biography) => updateBiographyMutation({ data: biography })),
      );
      await runBiographyMutations(
        newBiographies.map((biography) => createBiography({ data: biography, contributionId: contribution.id })),
      );
    } finally {
      if (hasSuccessfulBiographyMutation || !hasBiographyMutations) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
      }
    }
  };

  const updateOrcid = ({ orcid = '' }: OrcidForm) => {
    if (!contribution) return;

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
    if (!contribution) return;

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

  const updateCanonical = (isMain: boolean) => {
    if (!contribution) return;

    if (onIsMainSubmit) {
      onIsMainSubmit(isMain);
      return;
    }

    updateContribution({
      ...contribution,
      isMain,
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
    defaultLocaleOption,
    finishEditing,
    updateNames,
    updateType,
    updateBiography,
    updateOrcid,
    updateWebsiteUrl,
    updateAffiliations: updateContributionAffiliations,
    deleteAffiliation: deleteContributionAffiliation,
    moveAffiliation: moveContributionAffiliation,
    updateCanonical,
  };
};
