'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import DataIndicator from '../../core/DataIndicator/DataIndicator';
import ContentSection from '../ContentSection/ContentSection';

type RecommendedSectionProps = {
  title: string;
  isEmpty?: boolean;
  isValid?: boolean;
  id?: string;
  children?: ({ showRecommendations }: { showRecommendations: boolean }) => React.ReactNode;
};

const RecommendedSection = (props: RecommendedSectionProps) => {
  const { title, isEmpty, isValid, id, children } = props;

  const [showRecommendations, setShowRecommendations] = useState(false);
  const { t } = useTranslation();

  const handleRecommendations = () => {
    setShowRecommendations((prev) => !prev);
  };

  return (
    <ContentSection
      title={t(title)}
      id={id}
      headerContent={
        <DataIndicator
          isActive={showRecommendations}
          isEmpty={isEmpty}
          isValid={isValid}
          onClick={handleRecommendations}
        />
      }
    >
      {children && children({ showRecommendations })}
    </ContentSection>
  );
};

export default RecommendedSection;
