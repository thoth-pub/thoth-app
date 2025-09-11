import { WorkBasicDetails, WorkDescriptionDetails, WorkHeader } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { FormFieldOption, QueryToken } from '@/src/shared';

type EditWorkWidgetProps = {
  queryToken: QueryToken;
  workId: WorkId;
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { workStatusOptions, imprintOptions, workTypeOptions, queryToken, workId } = props;

  return (
    <div className="flex flex-col gap-8">
      <WorkHeader queryToken={queryToken} workId={workId} workStatusOptions={workStatusOptions} />
      <WorkBasicDetails
        workId={workId}
        queryToken={queryToken}
        imprintOptions={imprintOptions}
        workTypeOptions={workTypeOptions}
      />
      <WorkDescriptionDetails />
    </div>
  );
};

export default EditWorkWidget;
