'use client';

import { AffiliationEntity, AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import { useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
  WorkContribution,
} from '@/src/entities/contribution/model/contribution.types';
import { useContributor, useUpdateContributor } from '@/src/entities/contributor';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import { useWork } from '@/src/entities/work';
import { type BaseEditSectionProps } from '@/src/shared';

type UseAddNewContributionProps = BaseEditSectionProps & {
  onCreate?: (contribution: WorkContribution) => void;
};

export const useAddNewContribution = (props: UseAddNewContributionProps) => {
  const { workId, onCreate } = props;

  const { activeContribution, update, close } = useContributionStateMachine();
  const { work, createContribution } = useWork(workId);

  const { contributor } = useContributor({ contributorId: activeContribution?.contributorId });
  const { updateContributor } = useUpdateContributor({
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

  const create = () => {
    if (!activeContribution) return;

    if (onCreate) {
      onCreate(activeContribution);
      return;
    }

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
        name: contributor.fullName,
        updatedAt: '',
        lastContributionTitle: '',
      });
    }

    const lastOrderNumber = work.contributions.sort((a, b) => b.orderNumber - a.orderNumber)[0]?.orderNumber || 1;

    createContribution({
      data: { ...activeContribution, isMain: true, orderNumber: lastOrderNumber + 1 },
      relatedWorkId: workId,
    });

    close();
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

  const moveAffiliation = (data: AffiliationsForm['affiliations']) => {
    if (!activeContribution) return;

    const updatedAffiliations: AffiliationEntity[] = data.map((item, index) => ({
      id: item.id,
      contributionId: activeContribution.id || '',
      institutionId: item.affiliation?.value || '',
      institutionName: item.affiliation?.label || '',
      rorId: item.affiliation?.value || '',
      position: item.position || '',
      orderNumber: index + 1,
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
    moveAffiliation,
  };
};
