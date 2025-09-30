import { AffiliationsForm } from '@/src/entities/affiliation';
import type { AffiliationsForm as AffiliationsFormType } from '@/src/entities/affiliation/model/affiliation.types';
import { ContributionForms } from '@/src/entities/contribution';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

import { useEditContribution } from './useEditContribution';

type EditContributionProps = {
  showRecommendations: boolean;
  workId: WorkId;
  queryToken: QueryToken;
  isAdmin?: boolean;
  linkedPublishers?: PublisherId[];
};

const EditContribution = (props: EditContributionProps) => {
  const { showRecommendations, workId, queryToken, isAdmin, linkedPublishers } = props;

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
      showRecommendations={showRecommendations}
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
        recommended={showRecommendations}
        disabled={isOrchidEditionDisabled}
        onSubmit={updateOrcid}
      />
      <EditWebsite
        websiteUrl={contribution.website}
        recommended={showRecommendations}
        disabled={isWebsiteUrlEditionDisabled}
        onSubmit={updateWebsiteUrl}
      />
      <AffiliationsForm
        defaultValue={contribution.affiliations}
        onUpdate={updateAffiliations}
        onDelete={deleteAffiliation}
      />
    </ContributionForms>
  );
};

export default EditContribution;
