'use client';

import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentSection, TranslatedContent, Typography } from '@/src/shared/ui';

const EditWorkResources = (props: BaseEditSectionProps) => {
  const { workId } = props;

  return (
    <ContentSection title={<TranslatedContent content="additional resources" />}>
      <div>
        <Typography variant="h2">Additional Resources {workId}</Typography>
      </div>
    </ContentSection>
  );
};

export default EditWorkResources;
