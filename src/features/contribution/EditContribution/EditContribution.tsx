import { AffiliationsForm } from '@/src/entities/affiliation';
import { ContributionForms } from '@/src/entities/contribution';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import type { BaseRecommendedSectionProps } from '@/src/shared';

import { useEditContribution } from './useEditContribution';

type EditContributionProps = BaseRecommendedSectionProps & {
  isAdmin?: boolean;
  linkedPublishers?: PublisherId[];
};

const EditContribution = (props: EditContributionProps) => {
  const { recommended = false, workId, queryToken, isAdmin, linkedPublishers } = props;

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
    deleteAffiliation,
  } = useEditContribution({
    workId,
    queryToken,
    isAdmin,
    linkedPublishers,
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
      <EditOrcid
        orcidId={contribution.orcidId}
        recommended={recommended}
        disabled={isOrchidEditionDisabled}
        onSubmit={updateOrcid}
      />
      <EditWebsite
        websiteUrl={contribution.website}
        recommended={recommended}
        disabled={isWebsiteUrlEditionDisabled}
        onSubmit={updateWebsiteUrl}
      />
      <AffiliationsForm
        defaultValue={contribution.affiliations}
        showRecommendations={recommended}
        onUpdate={updateAffiliations}
        onDelete={deleteAffiliation}
      />
    </ContributionForms>
  );
};

export default EditContribution;
