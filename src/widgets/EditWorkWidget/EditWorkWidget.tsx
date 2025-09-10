import { WorkBasicDetails, WorkDescriptionDetails, WorkHeader } from '@/src/entities/work';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import type { FormFieldOption } from '@/src/shared';

type EditWorkWidgetProps = {
  work: WorkEntity;
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
};

const EditWorkWidget = ({ work, workStatusOptions, imprintOptions, workTypeOptions }: EditWorkWidgetProps) => {
  const { title, type } = work;

  console.log(work);

  return (
    <div className="flex flex-col gap-8">
      <WorkHeader title={title} workStatusOptions={workStatusOptions} />
      <WorkBasicDetails
        title={title}
        workType={type}
        imprintOptions={imprintOptions}
        workTypeOptions={workTypeOptions}
      />
      <WorkDescriptionDetails />
    </div>
  );
};

export default EditWorkWidget;
