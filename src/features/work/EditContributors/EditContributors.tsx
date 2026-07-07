'use client';

import { useEffect } from 'react';

import { useContributionStateMachine, WorkContributionsList } from '@/src/entities/contribution';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { AddContributionModal, AddNewContribution, EditContribution } from '@/src/features';
import { ANCHORS } from '@/src/shared/constants';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { RecommendedSection, TranslatedContent } from '@/src/shared/ui';
import { isDefaultId } from '@/src/shared/utils';

type EditContributorsProps = BaseEditSectionProps;

const EditContributors = (props: EditContributorsProps) => {
  const { workId } = props;
  const { activeEntity: activeContribution, finishEditing } = useContributionStateMachine();

  const { work } = useWork(workId);
  const { isContributionsRequired } = useWorkRecommendations({ workId });

  const isNewContribution = activeContribution ? isDefaultId(activeContribution.id) : false;

  const isEmpty = work.contributions.length === 0;

  useEffect(() => {
    return () => {
      finishEditing();
    };
  }, [finishEditing]);

  return (
    <RecommendedSection
      title={<TranslatedContent content="contributors" />}
      isEmpty={isEmpty}
      isValid={!isContributionsRequired}
      id={ANCHORS.CONTRIBUTIONS}
    >
      {({ showRecommendations }) => (
        <>
          <WorkContributionsList
            workId={workId}
            form={<EditContribution recommended={showRecommendations} workId={workId} />}
            showRecommendations={showRecommendations}
          />
          {isNewContribution && <AddNewContribution recommended={showRecommendations} workId={workId} />}
          <AddContributionModal />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditContributors;
