'use client';

import { ContributionsTable, useContributionStateMachine } from '@/src/entities/contribution';
import { useWork } from '@/src/entities/work';
import { AddContributionModal, AddNewContribution, EditContribution } from '@/src/features';
import { type BaseEditSectionProps, isDefaultId } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditContributorsProps = BaseEditSectionProps & {
  isAdmin?: boolean;
};

const EditContributors = (props: EditContributorsProps) => {
  const { workId, queryToken, isAdmin = false } = props;
  const { activeContribution } = useContributionStateMachine();

  const { work } = useWork(workId, queryToken);

  const isNewContribution = activeContribution && isDefaultId(activeContribution.id);

  const isValid =
    work.contributions.length > 0 &&
    work.contributions.every((contribution) => contribution.biography && contribution.affiliations.length > 0);
  const isEmpty = work.contributions.length === 0;

  return (
    <RecommendedSection title="Contributors" isEmpty={isEmpty} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          <ContributionsTable
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
