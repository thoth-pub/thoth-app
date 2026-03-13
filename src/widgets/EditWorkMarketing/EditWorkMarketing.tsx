'use client';

import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentSection, TranslatedContent } from '@/src/shared/ui';

import { AwardsSection } from './components/AwardsSection';
import { BookReviewsSection } from './components/BookReviewsSection';
import { EndorsementsSection } from './components/EndorsementsSection';

const EditWorkMarketing = (props: BaseEditSectionProps) => {
  const { workId } = props;

  return (
    <ContentSection title={<TranslatedContent content="marketing" />}>
      <AwardsSection workId={workId} />
      <EndorsementsSection workId={workId} endorsements={[]} />
      <BookReviewsSection workId={workId} bookReviews={[]} />
    </ContentSection>
  );
};

export default EditWorkMarketing;
