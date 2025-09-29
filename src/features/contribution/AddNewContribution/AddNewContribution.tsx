import { ContributionForms } from '@/src/entities/contribution';
import type {
  ContributionBiographyForm,
  ContributionNamesForm,
} from '@/src/entities/contribution/model/contribution.types';
import type { ContributionType } from '@/src/entities/contributor/model/contributor.types';
// import type { OrcidForm, WebsiteUrlForm } from '@/src/entities/contributor/model/contributor.validation';
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

  const { activeContribution, close } = useAddNewContribution({ workId, queryToken });

  const handleDone = () => {
    console.log('handleDone');
    close();
  };

  const handleNamesSubmit = (data: ContributionNamesForm) => {
    console.log('handleNamesSubmit', data);
  };

  const handleContributorTypeSubmit = (data: { contributorType: ContributionType }) => {
    console.log('handleContributorTypeSubmit', data);
  };

  const handleBiographySubmit = (data: ContributionBiographyForm) => {
    console.log('handleBiographySubmit', data);
  };

  // const handleOrcidSubmit = (data: OrcidForm) => {
  //   console.log('handleOrcidSubmit', data);
  // };

  // const handleWebsiteUrlSubmit = (data: WebsiteUrlForm) => {
  //   console.log('handleWebsiteUrlSubmit', data);
  // };

  if (!activeContribution) return null;

  return (
    <ContributionForms
      showRecommendations={showRecommendations}
      contribution={activeContribution}
      onNamesSubmit={handleNamesSubmit}
      onContributorTypeSubmit={handleContributorTypeSubmit}
      onBiographySubmit={handleBiographySubmit}
      onDone={handleDone}
    />
  );
};

export default AddNewContribution;
