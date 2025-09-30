import { ContributionForms } from '@/src/entities/contribution';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';

import { useAddNewContribution } from './useAddNewContribution';

type AddNewContributionProps = {
  showRecommendations: boolean;
  workId: WorkId;
  queryToken: QueryToken;
};

const AddNewContribution = (props: AddNewContributionProps) => {
  const { showRecommendations, workId, queryToken } = props;

  const {
    contribution,
    close,
    create,
    updateNames,
    updateContributorType,
    updateBiography,
    updateOrcid,
    updateWebsiteUrl,
  } = useAddNewContribution({ workId, queryToken });

  if (!contribution) return null;

  return (
    <div className="rounded-2xl bg-[var(--color-form-background)] p-4">
      <ContributionForms
        showRecommendations={showRecommendations}
        contribution={contribution}
        onNamesSubmit={updateNames}
        onContributorTypeSubmit={updateContributorType}
        onBiographySubmit={updateBiography}
        onDone={create}
        onClose={close}
      >
        <EditOrcid orcidId={contribution.orcidId} recommended={showRecommendations} onSubmit={updateOrcid} />
        <EditWebsite websiteUrl={contribution.website} recommended={showRecommendations} onSubmit={updateWebsiteUrl} />
      </ContributionForms>
    </div>
  );
};

export default AddNewContribution;
