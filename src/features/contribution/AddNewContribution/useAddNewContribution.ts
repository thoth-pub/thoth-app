'use client';

import { useState } from 'react';

import { useCreateAffiliation } from '@/src/entities/affiliation';
import { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import { useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
} from '@/src/entities/contribution/model/contribution.types';
import { useContributor, useCreateContributor, useUpdateContributor } from '@/src/entities/contributor';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import { useWork } from '@/src/entities/work';
import type { WorkContribution, WorkId } from '@/src/entities/work/model/work.types';
import { isDefaultId, NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

type UseAddNewContributionProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const { CONTRIBUTOR_CREATION_SUCCESS, CONTRIBUTOR_CREATION_FAILED, CONTRIBUTOR_UPDATE_FAILED } = NOTIFICATIONS;

export const useAddNewContribution = (props: UseAddNewContributionProps) => {
  const { workId, queryToken } = props;

  const { activeContribution, close } = useContributionStateMachine();
  const [contribution, setContribution] = useState<WorkContribution | null>(activeContribution);
  const { createAffiliation } = useCreateAffiliation({
    queryToken,
    workId,
  });
  const { work, createContributionRef } = useWork(workId, queryToken, (data) => {
    contribution?.affiliations.forEach(async ({ institutionId, position }, index) => {
      await createAffiliation({
        variables: {
          data: {
            contributionId: data.contributionId,
            institutionId,
            affiliationOrdinal: 1 + index,
            position: position && position.length > 0 ? position : null,
          },
        },
      });
    });

    // TODO add to set state
  });

  const { sendSuccessNotification, sendErrorNotification } = useNotifications();
  const { contributor } = useContributor({ contributorId: contribution?.contributorId });
  const { createContributor } = useCreateContributor({
    queryToken,
    onCompleted: (data) => {
      sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);

      if (!contribution) return;

      createContributionRef({
        ...contribution,
        isMain: true,
        orderNumber: work.contributions.length + 1,
        contributorId: data.contributorId,
      });
    },
    onError: () => {
      sendErrorNotification(CONTRIBUTOR_CREATION_FAILED);
      close();
    },
  });
  const { updateContributor } = useUpdateContributor({
    queryToken,
    workId,
    contributorId: contribution?.contributorId,
    onError: () => {
      sendErrorNotification(CONTRIBUTOR_UPDATE_FAILED);
      close();
    },
  });

  const updateContribution = (data: WorkContribution) => {
    setContribution(data);
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

  const updateContributorType = ({ contributorType }: ContributionTypeForm) => {
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
    if (!contribution) return;

    updateContribution({
      ...contribution,
      orcidId: orcid,
    });
  };

  const updateWebsiteUrl = ({ websiteUrl = '' }: WebsiteUrlForm) => {
    if (!contribution) return;

    updateContribution({
      ...contribution,
      website: websiteUrl,
    });
  };

  const createWithNewContributor = () => {
    if (!contribution) return;

    createContributor({
      fullName: contribution.fullName,
      lastName: contribution.lastName,
      firstName: contribution.firstName,
      orcid: contribution.orcidId,
      website: contribution.website,
    });

    close();
  };

  const createWithExistingContributor = () => {
    if (!contribution) return;

    const isOrchidEdit = contribution.orcidId && contribution.orcidId !== '';
    const isWebsiteEdit = contribution.website && contribution.website !== '';

    if ((isOrchidEdit || isWebsiteEdit) && contributor) {
      updateContributor({
        firstName: contributor.firstName,
        lastName: contributor.lastName,
        fullName: contributor.fullName,
        orcid: contribution.orcidId,
        website: contribution.website,
        id: contributor.id,
      });
    }

    createContributionRef({
      ...contribution,
      isMain: true,
      orderNumber: work.contributions.length + 1,
    });

    close();
  };

  const create = () => {
    if (!contribution) return;

    const isNewContributor = isDefaultId(contribution.contributorId);

    if (isNewContributor) {
      createWithNewContributor();
      return;
    }

    createWithExistingContributor();
  };

  const updateContributionAffiliations = (data: AffiliationsForm) => {
    if (!contribution) return;

    updateContribution({
      ...contribution,
      affiliations: data.affiliations.map((affiliation) => ({
        id: affiliation.id || '',
        contributionId: contribution.id || '',
        institutionId: affiliation.affiliation.value || '',
        institutionName: affiliation.affiliation.label || '',
        rorId: affiliation.affiliation.value || '',
        orderNumber: contribution.affiliations.length + 1,
        position: affiliation.position || '',
      })),
    });
  };

  const deleteAffiliation = (_id: string, index: number) => {
    if (!contribution) return;

    const updatedAffiliations = contribution.affiliations
      .filter((_affiliation, i) => i !== index)
      .map((affiliation, affiliationIndex) => ({
        ...affiliation,
        orderNumber: affiliationIndex + 1,
      }));

    updateContribution({
      ...contribution,
      affiliations: updatedAffiliations,
    });
  };

  return {
    contribution,
    close,
    create,
    updateWebsiteUrl,
    updateOrcid,
    updateBiography,
    updateContributorType,
    updateNames,
    updateAffiliations: updateContributionAffiliations,
    deleteAffiliation,
  };
};
