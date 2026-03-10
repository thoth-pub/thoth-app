import type { WorkContribution } from '../../model/contribution.types';
import { ContributionsTable } from '../components/Table';

type ChaptersContributionsTableProps = {
  contributions: WorkContribution[];
  activeContribution: WorkContribution | null;
  deleteLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  onDragEnd: (event: WorkContribution[]) => void;
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const ChaptersContributionsTable = (props: ChaptersContributionsTableProps) => {
  const { contributions, activeContribution, form, showRecommendations, onEdit, onDelete, deleteLoading, onSelectAsMain, onDragEnd } =
    props;

  return (
    <ContributionsTable
      contributions={contributions}
      activeContribution={activeContribution}
      form={form}
      showRecommendations={showRecommendations}
      onEdit={onEdit}
      onDelete={onDelete}
      deleteLoading={deleteLoading}
      onSelectAsMain={onSelectAsMain}
      onDragEnd={onDragEnd}
    />
  );
};

export default ChaptersContributionsTable;
