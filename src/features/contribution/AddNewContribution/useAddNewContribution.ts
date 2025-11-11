'use client';

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
import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { type BaseEditSectionProps, isDefaultId } from '@/src/shared';

type UseAddNewContributionProps = BaseEditSectionProps & {
  onCreate?: (contribution: WorkContribution) => void;
};

export const useAddNewContribution = (props: UseAddNewContributionProps) => {
  const { workId, queryToken, onCreate } = props;

  const { activeContribution, update, close } = useContributionStateMachine();
  const { createAffiliation } = useCreateAffiliation({
    queryToken,
    workId,
  });
  const { work, createContribution } = useWork(workId, queryToken, (data) => {
    if (!activeContribution) return;

    activeContribution.affiliations.forEach(async ({ institutionId, position }, index) => {
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
  });

  const { contributor } = useContributor({ contributorId: activeContribution?.contributorId });
  const { createContributor } = useCreateContributor({
    queryToken,
    onCompleted: (data) => {
      if (!activeContribution) return;

      createContribution({
        ...activeContribution,
        isMain: true,
        orderNumber: work.contributions.length + 1,
        contributorId: data.contributorId,
      });
    },
    onError: () => close(),
  });
  const { updateContributor } = useUpdateContributor({
    queryToken,
    workId,
    contributorId: activeContribution?.contributorId,
    onError: () => close(),
  });

  const updateContribution = (data: WorkContribution) => {
    update(data);
  };

  const updateNames = ({ fullName, firstName = '', lastName }: ContributionNamesForm) => {
    if (!activeContribution) return;

    updateContribution({
      ...activeContribution,
      fullName,
      firstName,
      lastName,
    });
  };

  const updateContributorType = ({ contributorType }: ContributionTypeForm) => {
    if (!activeContribution) return;

    updateContribution({
      ...activeContribution,
      type: contributorType,
    });
  };

  const updateBiography = ({ contributorBiography = '' }: ContributionBiographyForm) => {
    if (!activeContribution) return;

    updateContribution({
      ...activeContribution,
      biography: contributorBiography,
    });
  };

  const updateOrcid = ({ orcid = '' }: OrcidForm) => {
    if (!activeContribution) return;

    updateContribution({
      ...activeContribution,
      orcidId: orcid,
    });
  };

  const updateWebsiteUrl = ({ websiteUrl = '' }: WebsiteUrlForm) => {
    if (!activeContribution) return;

    updateContribution({
      ...activeContribution,
      website: websiteUrl,
    });
  };

  const createWithNewContributor = () => {
    if (!activeContribution) return;

    createContributor({
      fullName: activeContribution.fullName,
      lastName: activeContribution.lastName,
      firstName: activeContribution.firstName,
      orcid: activeContribution.orcidId,
      website: activeContribution.website,
    });

    close();
  };

  const createWithExistingContributor = () => {
    if (!activeContribution) return;

    const isOrchidEdit = activeContribution.orcidId && activeContribution.orcidId !== '';
    const isWebsiteEdit = activeContribution.website && activeContribution.website !== '';

    if ((isOrchidEdit || isWebsiteEdit) && contributor) {
      updateContributor({
        firstName: contributor.firstName,
        lastName: contributor.lastName,
        fullName: contributor.fullName,
        orcid: activeContribution.orcidId,
        website: activeContribution.website,
        id: contributor.id,
      });
    }

    createContribution({
      ...activeContribution,
      isMain: true,
      orderNumber: work.contributions.length + 1,
    });

    close();
  };

  const create = () => {
    if (!activeContribution) return;

    if (onCreate) {
      onCreate(activeContribution);
      return;
    }

    const isNewContributor = isDefaultId(activeContribution.contributorId);

    if (isNewContributor) {
      createWithNewContributor();
      return;
    }

    createWithExistingContributor();
  };

  const updateContributionAffiliations = (data: AffiliationsForm) => {
    if (!activeContribution) return;

    updateContribution({
      ...activeContribution,
      affiliations: data.affiliations.map((affiliation) => ({
        id: affiliation.id || '',
        contributionId: activeContribution.id || '',
        institutionId: affiliation.affiliation.value || '',
        institutionName: affiliation.affiliation.label || '',
        rorId: affiliation.affiliation.value || '',
        orderNumber: activeContribution.affiliations.length + 1,
        position: affiliation.position || '',
      })),
    });
  };

  const deleteAffiliation = (_id: string, index: number) => {
    if (!activeContribution) return;

    const updatedAffiliations = activeContribution.affiliations
      .filter((_affiliation, i) => i !== index)
      .map((affiliation, affiliationIndex) => ({
        ...affiliation,
        orderNumber: affiliationIndex + 1,
      }));

    updateContribution({
      ...activeContribution,
      affiliations: updatedAffiliations,
    });
  };

  return {
    contribution: activeContribution,
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
