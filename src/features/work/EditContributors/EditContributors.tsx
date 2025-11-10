'use client';

import { WorkContributionsTable, useContributionStateMachine } from '@/src/entities/contribution';
import { useWork, useWorkRecommendations } from '@/src/entities/work';
import { AddContributionModal, AddNewContribution, EditContribution } from '@/src/features';
import { ANCHORS, type BaseEditSectionProps, isDefaultId } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditContributorsProps = BaseEditSectionProps & {
  isAdmin?: boolean;
};

const EditContributors = (props: EditContributorsProps) => {
  const { workId, queryToken, isAdmin = false } = props;
  const { activeContribution } = useContributionStateMachine();

  const { work } = useWork(workId, queryToken);
  const { isContributionsRequired } = useWorkRecommendations({ workId });

  const isNewContribution = activeContribution && isDefaultId(activeContribution.id);

  const isEmpty = work.contributions.length === 0;

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
            queryToken={queryToken}
            form={
              <EditContribution
                recommended={showRecommendations}
                workId={workId}
                queryToken={queryToken}
                isAdmin={isAdmin}
              />
            }
            showRecommendations={showRecommendations}
          />
          {isNewContribution && (
            <AddNewContribution recommended={showRecommendations} workId={workId} queryToken={queryToken} />
          )}
          <AddContributionModal />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditContributors;
