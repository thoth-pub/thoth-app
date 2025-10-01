import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditDescriptionsProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const EditDescriptions = (props: EditDescriptionsProps) => {
  const { workId, queryToken } = props;

  return (
    <RecommendedSection title="Descriptions" isEmpty={true} isValid={false}>
      {/* {({ showRecommendations }) => null} */}
    </RecommendedSection>
  );
};

export default EditDescriptions;
