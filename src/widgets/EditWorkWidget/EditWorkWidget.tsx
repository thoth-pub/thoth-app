import type { PublisherId } from '@/src/entities/publisher/model/publisher.types';
import { EditWorkHeader } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { EditBasicDetails } from '@/src/features';
import type { FormFieldOption, QueryToken } from '@/src/shared';

import { EditWorkContributors } from './components/EditWorkContributors';

type EditWorkWidgetProps = {
  queryToken: QueryToken;
  workId: WorkId;
  workStatusOptions: FormFieldOption[];
  imprintOptions: FormFieldOption[];
  contributorTypeOptions: FormFieldOption[];
  linkedPublishers?: PublisherId[];
  isAdmin?: boolean;
};

const EditWorkWidget = (props: EditWorkWidgetProps) => {
  const {
    workStatusOptions,
    imprintOptions,
    queryToken,
    workId,
    contributorTypeOptions,
    linkedPublishers = [],
    isAdmin = false,
  } = props;

  return (
    <div className="flex flex-col gap-8">
      <EditWorkHeader queryToken={queryToken} workId={workId} workStatusOptions={workStatusOptions} />
      <EditBasicDetails workId={workId} queryToken={queryToken} imprintOptions={imprintOptions} />
      <EditWorkContributors
        workId={workId}
        queryToken={queryToken}
        contributorTypeOptions={contributorTypeOptions}
        linkedPublishers={linkedPublishers}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default EditWorkWidget;
