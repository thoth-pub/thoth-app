import { CardsList } from '@/src/shared/ui';

import type { WorkContribution } from '../../model/contribution.types';
import { ContributionListItem } from '../WorkContributionsList/components/ContributionListItem';

type ChaptersContributionsListProps = {
  contributions: WorkContribution[];
  activeContribution: WorkContribution | null;
  deleteLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: WorkContribution[]) => void;
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const ChaptersContributionsList = (props: ChaptersContributionsListProps) => {
  const { contributions, activeContribution, deleteLoading, onEdit, onDelete, onDragEnd, form, showRecommendations } =
    props;

  return (
    <CardsList items={contributions} onDragEnd={onDragEnd} draggable={contributions.length > 1}>
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
              deleteLoading={deleteLoading}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </CardsList>
  );
};

export default ChaptersContributionsList;
