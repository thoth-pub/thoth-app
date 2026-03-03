'use client';

import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentSection, TranslatedContent, Typography } from '@/src/shared/ui';

const EditWorkMarketing = (props: BaseEditSectionProps) => {
  const { workId } = props;

  return (
    <ContentSection title={<TranslatedContent content="marketing" />}>
      <div>
        <Typography variant="h2">Marketing {workId}</Typography>
      </div>
    </ContentSection>
  );
};

export default EditWorkMarketing;
