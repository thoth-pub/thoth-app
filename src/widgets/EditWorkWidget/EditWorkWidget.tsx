import { EditWorkHeader } from '@/src/entities/work';
import { EditBasicDetails, EditContributors, EditDescriptions } from '@/src/features';
import EditPublications from '@/src/features/work/EditPublications/EditPublications';
import type { BaseEditSectionProps, FormFieldOption } from '@/src/shared';

type EditWorkWidgetProps = BaseEditSectionProps & {
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  isAdmin?: boolean;
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const { workStatusOptions, imprintOptions, queryToken, workId, isAdmin = false } = props;

  return (
    <div className="flex flex-col gap-8">
      <EditWorkHeader queryToken={queryToken} workId={workId} workStatusOptions={workStatusOptions} />
      <EditBasicDetails workId={workId} queryToken={queryToken} imprintOptions={imprintOptions} />
      <EditContributors workId={workId} queryToken={queryToken} isAdmin={isAdmin} />
      <EditDescriptions workId={workId} queryToken={queryToken} />
      <EditPublications workId={workId} queryToken={queryToken} />
    </div>
  );
};

export default EditWorkWidget;
