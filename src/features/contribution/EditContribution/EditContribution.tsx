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
    onNamesUpdate: (data: ContributionNamesForm) => void;
    onTypeUpdate: (data: ContributionTypeForm) => void;
    onBiographiesUpdate: (data: ContributionBiographyForm) => void;
    onOrcidUpdate: (data: OrcidForm) => void;
    onWebsiteUrlUpdate: (data: WebsiteUrlForm) => void;
    onAffiliationsUpdate: (data: AffiliationsFormType) => void;
    onDeleteAffiliation: (id: string) => void;
    onAffiliationOrderUpdate: (data: AffiliationsFormType['affiliations']) => void;
    onIsMainSubmit: (isMain: boolean) => void;
  }>;

const EditContribution = (props: EditContributionProps) => {
  const {
    recommended = false,
    workId,
    onNamesUpdate,
    onTypeUpdate,
    onBiographiesUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onAffiliationsUpdate,
    onDeleteAffiliation,
    onAffiliationOrderUpdate,
    onIsMainSubmit,
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
    updateCanonical,
    updateOrcid,
    updateWebsiteUrl,
    updateAffiliations,
    deleteAffiliation,
    moveAffiliation,
  } = useEditContribution({
    workId,
    linkedPublishers: publishersIds,
    onNamesUpdate,
    onTypeUpdate,
    onBiographiesUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onAffiliationsUpdate,
    onDeleteAffiliation,
    onMoveAffiliation: onAffiliationOrderUpdate,
    onIsMainSubmit,
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
      onIsMainSubmit={updateCanonical}
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
        onDelete={deleteAffiliation}
      />
    </ContributionForms>
  );
};

export default EditContribution;
