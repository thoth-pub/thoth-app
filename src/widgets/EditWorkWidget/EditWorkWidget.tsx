import { WorkBasicDetails, WorkDescriptionDetails, WorkHeader } from '@/src/entities/work';
import type { WorkHeaderProps } from '@/src/entities/work/ui/WorkHeader/WorkHeader';

type EditWorkWidgetProps = WorkHeaderProps;

const EditWorkWidget = ({ title, workStatusOptions }: EditWorkWidgetProps) => {
  return (
    <div className="flex flex-col gap-8">
      <WorkHeader title={title} workStatusOptions={workStatusOptions} />
      <WorkBasicDetails title={title} />
      <WorkDescriptionDetails />
    </div>
  );
};

export default EditWorkWidget;
