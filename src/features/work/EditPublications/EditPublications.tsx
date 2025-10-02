'use client';

import type { BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

const EditPublications = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  return (
    <RecommendedSection title="Publications" isEmpty={false} isValid={false}>
      {({ showRecommendations }) => <p>Publications</p>}
    </RecommendedSection>
  );
};

export default EditPublications;
