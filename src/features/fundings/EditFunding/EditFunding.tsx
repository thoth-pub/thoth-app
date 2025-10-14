import { useFundingsStateMachine } from '@/src/entities/funding';
import type { BaseRecommendedSectionProps } from '@/src/shared';

import EditFundingForm from '../EditFundingForm/EditFundingForm';

const EditFunding = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { close, edit } = useFundingsStateMachine();

  return (
    <EditFundingForm
      recommended={recommended}
      grantNumber={''}
      institution={{ value: '', label: '' }}
      jurisdiction={''}
      program={''}
      projectName={''}
      projectShortname={''}
      onProjectUpdate={(data) => console.log('project updated', data)}
      onProjectShortNameUpdate={(data) => console.log('project short name updated', data)}
      onJurisdictionUpdate={(data) => console.log('jurisdiction updated', data)}
      onProgramUpdate={(data) => console.log('program updated', data)}
      onGrantNumberUpdate={(data) => console.log('grant number updated', data)}
      onInstitutionUpdate={(data) => console.log('institution updated', data)}
      onDone={close}
      onClose={close}
    />
  );
};

export default EditFunding;
