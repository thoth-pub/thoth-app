'use client';

import { useState } from 'react';

import DataIndicator from '../../core/DataIndicator/DataIndicator';
import ContentSection from '../ContentSection/ContentSection';


type RecommendedSectionProps = {
  title: string;
  isEmpty?: boolean;
  isValid?: boolean;
  children?: ({ showRecomendations }: { showRecomendations: boolean }) => React.ReactNode;
};

const RecommendedSection = (props: RecommendedSectionProps) => {
  const { title, isEmpty, isValid, children } = props;

  const [showRecomendations, setShowRecomendations] = useState(false);

  const handleRecomendations = () => {
    setShowRecomendations((prev) => !prev);
  };

  return (
    <ContentSection
      title={title}
      headerContent={<DataIndicator isEmpty={isEmpty} isValid={isValid} onClick={handleRecomendations} />}
    >
      {children && children({ showRecomendations })}
    </ContentSection>
  );
};

export default RecommendedSection;
