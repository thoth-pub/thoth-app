import { useEffect } from 'react';

import type { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import { useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
  WorkContribution,
} from '@/src/entities/contribution/model/contribution.types';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import { EditContribution } from '@/src/features/contribution';

type EditChaptersContributionsProps = {
  showRecommendations: boolean;
  onUpdate: (id: ContributionId, updatedData?: Partial<WorkContribution>) => void;
  onUpdateAffiliations: (data: AffiliationsForm, contributionId: ContributionId) => void;
  onDeleteAffiliation: (id: string, contributionId: ContributionId) => void;
  onAffiliationOrderUpdate: (data: AffiliationsForm['affiliations']) => void;
  onBiographiesUpdate: (data: ContributionBiographyForm, contributionId: ContributionId) => void;
};

export const EditChaptersContributions = (props: EditChaptersContributionsProps) => {
  const {
    showRecommendations,
    onUpdate,
    onUpdateAffiliations,
    onDeleteAffiliation,
    onAffiliationOrderUpdate,
    onBiographiesUpdate,
  } = props;

  const { activeContribution, close, update } = useContributionStateMachine();

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  const handleNamesUpdate = (data: ContributionNamesForm) => {
    if (!activeContribution) return;

    onUpdate(activeContribution.id, {
      fullName: data.fullName,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
    });
    update({
      ...activeContribution,
      fullName: data.fullName,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
    });
  };

  const handleTypeUpdate = ({ contributorType }: ContributionTypeForm) => {
    if (!activeContribution) return;

    onUpdate(activeContribution.id, {
      type: contributorType,
    });
    update({
      ...activeContribution,
      type: contributorType,
    });
  };

  const handleBiographiesUpdate = ({ biographies }: ContributionBiographyForm) => {
    if (!activeContribution) return;

    const biographiesToUpdate = biographies
      .map((biography, index) => ({
        id: biography.biographyId,
        canonical: index === 0,
        content: biography.contributorBiography ?? '',
        localeCode: biography.language.value,
        contributionId: activeContribution.id,
      }))
      .filter((biography) => biography.content.length > 0);

    onBiographiesUpdate({ biographies }, activeContribution.id);
    update({
      ...activeContribution,
      biographies: biographiesToUpdate,
    });
  };

  const handleOrcidUpdate = ({ orcid }: OrcidForm) => {
    if (!activeContribution || !orcid) return;

    onUpdate(activeContribution.id, {
      orcidId: orcid,
    });
    update({
      ...activeContribution,
      orcidId: orcid,
    });
  };

  const handleWebsiteUrlUpdate = ({ websiteUrl }: WebsiteUrlForm) => {
    if (!activeContribution || !websiteUrl) return;

    onUpdate(activeContribution.id, {
      website: websiteUrl,
    });
    update({
      ...activeContribution,
      website: websiteUrl,
    });
  };

  const handleAffiliationsUpdate = (data: AffiliationsForm) => {
    if (!activeContribution) return;

    onUpdateAffiliations(data, activeContribution.id);
  };

  const handleDeleteAffiliation = (id: string) => {
    if (!activeContribution) return;

    onDeleteAffiliation(id, activeContribution.id);
  };

  const handleAffiliationOrderUpdate = (data: AffiliationsForm['affiliations']) => {
    if (!activeContribution) return;

    onAffiliationOrderUpdate(data);
  };

  const handleIsMainSubmit = (isMain: boolean) => {
    if (!activeContribution) return;

    onUpdate(activeContribution.id, {
      isMain,
    });
    update({
      ...activeContribution,
      isMain,
    });
  };

  return (
    <EditContribution
      recommended={showRecommendations}
      workId=""
      onNamesUpdate={handleNamesUpdate}
      onTypeUpdate={handleTypeUpdate}
      onBiographiesUpdate={handleBiographiesUpdate}
      onOrcidUpdate={handleOrcidUpdate}
      onWebsiteUrlUpdate={handleWebsiteUrlUpdate}
      onAffiliationsUpdate={handleAffiliationsUpdate}
      onDeleteAffiliation={handleDeleteAffiliation}
      onAffiliationOrderUpdate={handleAffiliationOrderUpdate}
      onIsMainSubmit={handleIsMainSubmit}
    />
  );
};
