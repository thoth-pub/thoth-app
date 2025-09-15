import {
  EditWorkBasicDetails,
  EditWorkContributors,
  EditWorkDescriptionDetails,
  EditWorkHeader,
} from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { FormFieldOption, QueryToken } from '@/src/shared';

type EditWorkWidgetProps = {
  queryToken: QueryToken;
  workId: WorkId;
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { workStatusOptions, imprintOptions, workTypeOptions, licenseOptions, queryToken, workId } = props;

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
      <EditWorkContributors />
    </div>
  );
};

export default EditWorkWidget;
