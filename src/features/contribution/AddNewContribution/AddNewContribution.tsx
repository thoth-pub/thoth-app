import { AffiliationsForm } from '@/src/entities/affiliation';
import { ContributionForms } from '@/src/entities/contribution';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { BaseRecommendedSectionProps } from '@/src/shared';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

import { useAddNewContribution } from './useAddNewContribution';
import type { WorkContribution } from '@/src/entities/work/model/work.types';

type AddNewContributionProps = BaseRecommendedSectionProps & {
  onCreate?: (contribution: WorkContribution) => void;
};

const AddNewContribution = (props: AddNewContributionProps) => {
  const { recommended = false, workId, queryToken, onCreate } = props;

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
  } = useAddNewContribution({ workId, queryToken, onCreate });

  if (!contribution) return null;

  return (
    <TableNewEntityFormWrapper>
      <ContributionForms
        showRecommendations={recommended}
        contribution={contribution}
        onNamesSubmit={updateNames}
        onContributorTypeSubmit={updateContributorType}
        onBiographySubmit={updateBiography}
        onDone={create}
        onClose={close}
      >
        <EditOrcid orcidId={contribution.orcidId} onSubmit={updateOrcid} />
        <EditWebsite websiteUrl={contribution.website} onSubmit={updateWebsiteUrl} />
        <AffiliationsForm
          defaultValue={contribution.affiliations}
          showRecommendations={recommended}
          onUpdate={updateAffiliations}
        />
      </ContributionForms>
    </TableNewEntityFormWrapper>
  );
};

export default AddNewContribution;
