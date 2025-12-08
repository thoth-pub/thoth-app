import { AffiliationsForm } from '@/src/entities/affiliation';
import { type AffiliationsForm as AffiliationsFormType } from '@/src/entities/affiliation/model/affiliation.types';
import { ContributionForms } from '@/src/entities/contribution';
import {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
} from '@/src/entities/contribution/model/contribution.types';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import type { BaseRecommendedSectionProps } from '@/src/shared';

import { useEditContribution } from './useEditContribution';

type EditContributionProps = BaseRecommendedSectionProps &
  Partial<{
    isAdmin?: boolean;
    onNamesUpdate: (data: ContributionNamesForm) => void;
    onTypeUpdate: (data: ContributionTypeForm) => void;
    onBiographyUpdate: (data: ContributionBiographyForm) => void;
    onOrcidUpdate: (data: OrcidForm) => void;
    onWebsiteUrlUpdate: (data: WebsiteUrlForm) => void;
    onAffiliationsUpdate: (data: AffiliationsFormType) => void;
    onDeleteAffiliation: (id: string) => void;
    onAffiliationOrderUpdate: (data: AffiliationsFormType['affiliations']) => void;
  }>;

const EditContribution = (props: EditContributionProps) => {
  const {
    recommended = false,
    workId,
    queryToken,
    isAdmin,
    onNamesUpdate,
    onTypeUpdate,
    onBiographyUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onAffiliationsUpdate,
    onDeleteAffiliation,
  } = props;

  const { linkedPublishers } = usePublisherStateMachine();

  const publishersIds = linkedPublishers.map((publisher) => publisher.id);

  const {
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
    moveAffiliation,
  } = useEditContribution({
    workId,
    queryToken,
    isAdmin,
    linkedPublishers: publishersIds,
    onNamesUpdate,
    onTypeUpdate,
    onBiographyUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onAffiliationsUpdate,
    onDeleteAffiliation,
  });

  if (!contribution) return null;

  return (
    <ContributionForms
      showRecommendations={recommended}
      contribution={contribution}
      isOrchidEditionDisabled={isOrchidEditionDisabled}
      isWebsiteUrlEditionDisabled={isWebsiteUrlEditionDisabled}
      onDone={close}
      onClose={close}
      onNamesSubmit={updateNames}
      onContributorTypeSubmit={updateType}
      onBiographySubmit={updateBiography}
    >
      <EditOrcid orcidId={contribution.orcidId} disabled={isOrchidEditionDisabled} onSubmit={updateOrcid} />
      <EditWebsite
        websiteUrl={contribution.website}
        disabled={isWebsiteUrlEditionDisabled}
        onSubmit={updateWebsiteUrl}
      />
      <AffiliationsForm
        defaultValue={contribution.affiliations}
        showRecommendations={recommended}
        onUpdate={updateAffiliations}
        onDragEnd={moveAffiliation}
      />
    </ContributionForms>
  );
};

export default EditContribution;
