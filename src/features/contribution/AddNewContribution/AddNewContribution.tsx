import { AffiliationsForm } from '@/src/entities/affiliation';
import { ContributionForms } from '@/src/entities/contribution';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { EditOrcid, EditWebsite } from '@/src/entities/contributor';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

import { useAddNewContribution } from './useAddNewContribution';

type AddNewContributionProps = BaseRecommendedSectionProps & {
  onCreate?: (contribution: WorkContribution) => void;
};

const AddNewContribution = (props: AddNewContributionProps) => {
  const { recommended = false, workId, onCreate } = props;

  const {
    contribution,
    defaultLocaleOption,
    finishEditing,
    create,
    updateNames,
    updateContributorType,
    updateBiography,
    updateOrcid,
    updateWebsiteUrl,
    updateAffiliations,
    moveAffiliation,
    updateCanonical,
  } = useAddNewContribution({ workId, onCreate });

  if (!contribution) return null;

  return (
    <TableNewEntityFormWrapper>
      <ContributionForms
        showRecommendations={recommended}
        contribution={contribution}
        defaultLocaleOption={defaultLocaleOption}
        onNamesSubmit={updateNames}
        onContributorTypeSubmit={updateContributorType}
        onBiographySubmit={updateBiography}
        onIsMainSubmit={updateCanonical}
        onDone={create}
        onClose={finishEditing}
      >
        <EditOrcid orcidId={contribution.orcidId} onSubmit={updateOrcid} />
        <EditWebsite websiteUrl={contribution.website} onSubmit={updateWebsiteUrl} />
        <AffiliationsForm
          defaultValue={contribution.affiliations}
          showRecommendations={recommended}
          onUpdate={updateAffiliations}
          onDragEnd={moveAffiliation}
        />
      </ContributionForms>
    </TableNewEntityFormWrapper>
  );
};

export default AddNewContribution;
