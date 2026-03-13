'use client';

import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentSection, TranslatedContent } from '@/src/shared/ui';

import { AdditionalResourcesSection } from './components/AdditionalResourcesSection';

const EditWorkResources = (props: BaseEditSectionProps) => {
  const { workId } = props;

  return (
    <ContentSection title={<TranslatedContent content="additional resources" />}>
      <AdditionalResourcesSection workId={workId} additionalResources={[]} />
    </ContentSection>
  );
};

export default EditWorkResources;
