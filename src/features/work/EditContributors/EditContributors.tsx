'use client';

import { ContributionsTable, useContributionStateMachine } from '@/src/entities/contribution';
import type { PublisherId } from '@/src/entities/publisher';
import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddContributionModal, AddNewContribution, EditContribution } from '@/src/features';
import { isDefaultId, type QueryToken } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditContributorsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  linkedPublishers?: PublisherId[];
  isAdmin?: boolean;
};

const EditContributors = (props: EditContributorsProps) => {
  const { workId, queryToken, isAdmin = false, linkedPublishers = [] } = props;
  const { activeContribution } = useContributionStateMachine();

  const { work } = useWork(workId, queryToken);

  const isNewContribution = activeContribution && isDefaultId(activeContribution.id);

  const isValid =
    work.contributions.length > 0 &&
    work.contributions.every((contribution) => contribution.biography && contribution.affiliations.length > 0);

  return (
    <RecommendedSection title="Contributors" isEmpty={work.contributions.length === 0} isValid={isValid}>
      {({ showRecommendations }) => (
        <>
          <ContributionsTable
            workId={workId}
            queryToken={queryToken}
            form={
              <EditContribution
                showRecommendations={showRecommendations}
                workId={workId}
                queryToken={queryToken}
                isAdmin={isAdmin}
                linkedPublishers={linkedPublishers}
              />
            }
            showRecommendations={showRecommendations}
          />
          {isNewContribution && (
            <AddNewContribution showRecommendations={showRecommendations} workId={workId} queryToken={queryToken} />
          )}
          <AddContributionModal />
        </>
      )}
    </RecommendedSection>
  );
};

export default EditContributors;