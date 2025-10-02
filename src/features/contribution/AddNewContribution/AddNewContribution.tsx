import { AffiliationsForm } from '@/src/entities/affiliation';
import { ContributionForms } from '@/src/entities/contribution';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { BaseRecommendedSectionProps } from '@/src/shared';

import { useAddNewContribution } from './useAddNewContribution';

const AddNewContribution = (props: BaseRecommendedSectionProps) => {
  const { recommended = false, workId, queryToken } = props;

  const {
    contribution,
    close,
    create,
    updateNames,
    updateContributorType,
    updateBiography,
    updateOrcid,
    updateWebsiteUrl,
    updateAffiliations,
    deleteAffiliation,
  } = useAddNewContribution({ workId, queryToken });

  if (!contribution) return null;

  return (
    <div className="rounded-2xl bg-[var(--color-form-background)] p-4">
      <ContributionForms
        showRecommendations={recommended}
        contribution={contribution}
        onNamesSubmit={updateNames}
        onContributorTypeSubmit={updateContributorType}
        onBiographySubmit={updateBiography}
        onDone={create}
        onClose={close}
      >
        <EditOrcid orcidId={contribution.orcidId} recommended={recommended} onSubmit={updateOrcid} />
        <EditWebsite websiteUrl={contribution.website} recommended={recommended} onSubmit={updateWebsiteUrl} />
        <AffiliationsForm
          defaultValue={contribution.affiliations}
          showRecommendations={recommended}
          onUpdate={updateAffiliations}
          onDelete={deleteAffiliation}
        />
      </ContributionForms>
    </div>
  );
};

export default AddNewContribution;
