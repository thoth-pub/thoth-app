import { ContributionForms } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
  ContributionTypeForm,
} from '@/src/entities/contribution/model/contribution.types';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
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
  const { showRecommendations, workId, queryToken } = props;

  const { contribution, close, update, isOrchidEditionDisabled, isWebsiteUrlEditionDisabled } = useEditContribution({
    workId,
    queryToken,
  });

  const updateNames = ({ fullName, firstName = '', lastName }: ContributionNamesForm) => {
    if (!contribution) return;

    update({
      ...contribution,
      fullName,
      firstName,
      lastName,
    });
  };

  const updateType = ({ contributorType }: ContributionTypeForm) => {
    if (!contribution) return;

    update({
      ...contribution,
      type: contributorType,
    });
  };

  const updateBiography = ({ contributorBiography = '' }: ContributionBiographyForm) => {
    if (!contribution) return;

    update({
      ...contribution,
      biography: contributorBiography,
    });
  };

  const handleOrcidSubmit = ({ orcid = '' }: OrcidForm) => {
    if (!contribution) return;

    update({
      ...contribution,
      orcidId: orcid,
    });
  };

  const handleWebsiteUrlSubmit = ({ websiteUrl = '' }: WebsiteUrlForm) => {
    if (!contribution) return;

    update({
      ...contribution,
      website: websiteUrl,
    });
  };

  if (!contribution) return null;

  return (
    <ContributionForms
      showRecommendations={showRecommendations}
      contribution={contribution}
      isOrchidEditionDisabled={isOrchidEditionDisabled}
      isWebsiteUrlEditionDisabled={isWebsiteUrlEditionDisabled}
      onDone={close}
      onNamesSubmit={updateNames}
      onContributorTypeSubmit={updateType}
      onBiographySubmit={updateBiography}
    >
      <EditOrcid
        orcidId={contribution.orcidId}
        recommended={showRecommendations}
        disabled={isOrchidEditionDisabled}
        onSubmit={handleOrcidSubmit}
      />
      <EditWebsite
        websiteUrl={contribution.website}
        recommended={showRecommendations}
        disabled={isWebsiteUrlEditionDisabled}
        onSubmit={handleWebsiteUrlSubmit}
      />
    </ContributionForms>
  );
};

export default EditContribution;
