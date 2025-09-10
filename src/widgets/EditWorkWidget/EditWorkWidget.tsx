import { WorkBasicDetails, WorkDescriptionDetails, WorkHeader } from '@/src/entities/work';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { FormFieldOption, QueryToken } from '@/src/shared';

type EditWorkWidgetProps = {
  queryToken: QueryToken;
  work: WorkEntity;
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { work, workStatusOptions, imprintOptions, workTypeOptions, queryToken } = props;
  const { title, status } = work;

  return (
    <div className="flex flex-col gap-8">
      <WorkHeader status={status} title={title} workStatusOptions={workStatusOptions} />
      <WorkBasicDetails
        work={work}
        queryToken={queryToken}
        imprintOptions={imprintOptions}
        workTypeOptions={workTypeOptions}
      />
      <WorkDescriptionDetails />
    </div>
  );
};

export default EditWorkWidget;
