import { useEffect } from 'react';

import type { AffiliationsForm } from '@/src/entities/affiliation/model/affiliation.types';
import { useContributionStateMachine } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
} from '@/src/entities/contribution/model/contribution.types';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { EditContribution } from '@/src/features/contribution';
import type { QueryToken } from '@/src/shared';

type EditChaptersContributionsProps = {
  showRecommendations: boolean;
  queryToken: QueryToken;
  onUpdate: (id: ContributionId, updatedData?: Partial<WorkContribution>) => void;
  onUpdateAffiliations: (data: AffiliationsForm, contributionId: ContributionId) => void;
  onDeleteAffiliation: (id: string, contributionId: ContributionId) => void;
};

export const EditChaptersContributions = (props: EditChaptersContributionsProps) => {
  const { showRecommendations, queryToken, onUpdate, onUpdateAffiliations, onDeleteAffiliation } = props;

  const { activeContribution, close, update } = useContributionStateMachine();
  const { isAdmin } = usePublisherStateMachine();

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

  const handleBiographyUpdate = ({ contributorBiography }: ContributionBiographyForm) => {
    if (!activeContribution || !contributorBiography) return;

    onUpdate(activeContribution.id, {
      biography: contributorBiography,
    });
    update({
      ...activeContribution,
      biography: contributorBiography,
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

  return (
    <EditContribution
      recommended={showRecommendations}
      workId=""
      queryToken={queryToken}
      isAdmin={isAdmin}
      onNamesUpdate={handleNamesUpdate}
      onTypeUpdate={handleTypeUpdate}
      onBiographyUpdate={handleBiographyUpdate}
      onOrcidUpdate={handleOrcidUpdate}
      onWebsiteUrlUpdate={handleWebsiteUrlUpdate}
      onAffiliationsUpdate={handleAffiliationsUpdate}
      onDeleteAffiliation={handleDeleteAffiliation}
    />
  );
};
