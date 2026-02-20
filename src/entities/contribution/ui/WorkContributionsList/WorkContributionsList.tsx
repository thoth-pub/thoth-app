'use client';

import { type BaseEditSectionProps } from '@/src/shared';
import { CardsList } from '@/src/shared/ui';

import { ContributionListItem } from './components/ContributionListItem';
import { useContributionsList } from './useContributionsList';

type WorkContributionsListProps = BaseEditSectionProps & {
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const WorkContributionsList = (props: WorkContributionsListProps) => {
  const { workId, form, showRecommendations } = props;

  const {
    contributions,
    activeContribution,
    loading,
    fetching,
    editDisabled,
    dragEnd,
    editContribution,
    deleteContribution,
  } = useContributionsList({
    workId,
  });

  return (
    <CardsList
      items={contributions}
      onDragEnd={dragEnd}
      draggable={contributions.length > 1}
      loading={loading || fetching}
    >
      {(draggable) => (
        <>
          {contributions.map((contribution) => (
            <ContributionListItem
              key={contribution.id}
              contribution={contribution}
              showRecommendations={showRecommendations}
              editing={activeContribution?.id === contribution.id}
              form={form}
              draggable={draggable}
              editDisabled={editDisabled}
              onEdit={editContribution}
              onDelete={deleteContribution}
            />
          ))}
        </>
      )}
    </CardsList>
  );
};

export default WorkContributionsList;
