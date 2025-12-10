'use client';

import { useEffect } from 'react';

import { useContributionStateMachine, WorkContributionsTable } from '@/src/entities/contribution';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { AddContributionModal, AddNewContribution, EditContribution } from '@/src/features';
import { ANCHORS, type BaseEditSectionProps, isDefaultId } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditContributorsProps = BaseEditSectionProps & {
  isAdmin?: boolean;
};

const EditContributors = (props: EditContributorsProps) => {
  const { workId, isAdmin = false } = props;
  const { activeContribution, close } = useContributionStateMachine();

  const { work } = useWork(workId);
  const { isContributionsRequired } = useWorkRecommendations({ workId });

  const isNewContribution = activeContribution ? isDefaultId(activeContribution.id) : false;

  const isEmpty = work.contributions.length === 0;

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return (
    <RecommendedSection
      title="Contributors"
      isEmpty={isEmpty}
      isValid={!isContributionsRequired}
      id={ANCHORS.CONTRIBUTIONS}
    >
      {({ showRecommendations }) => (
        <>
          <WorkContributionsTable
            workId={workId}
            form={<EditContribution recommended={showRecommendations} workId={workId} isAdmin={isAdmin} />}
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
