import { EditWorkBasicDetails, EditWorkDescriptionDetails, EditWorkHeader } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { FormFieldOption, QueryToken } from '@/src/shared';

import { EditWorkContributors } from './components/EditWorkContributors';

type EditWorkWidgetProps = {
  queryToken: QueryToken;
  workId: WorkId;
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
  contributorTypeOptions: FormFieldOption[];
  isAdmin?: boolean;
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const {
    workStatusOptions,
    imprintOptions,
    workTypeOptions,
    licenseOptions,
    queryToken,
    workId,
    contributorTypeOptions,
    isAdmin = false,
  } = props;

  return (
    <div className="flex flex-col gap-8">
      <EditWorkHeader queryToken={queryToken} workId={workId} workStatusOptions={workStatusOptions} />
      <EditWorkBasicDetails
        workId={workId}
        queryToken={queryToken}
        imprintOptions={imprintOptions}
        workTypeOptions={workTypeOptions}
        licenseOptions={licenseOptions}
      />
      <EditWorkDescriptionDetails />
      <EditWorkContributors
        workId={workId}
        queryToken={queryToken}
        contributorTypeOptions={contributorTypeOptions}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default EditWorkWidget;
