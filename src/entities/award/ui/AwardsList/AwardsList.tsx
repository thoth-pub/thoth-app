import { CardsList } from '@/src/shared/ui';

import { AwardEntity } from '../../model/award.types';
import { AwardCardListItem } from './components/AwardCardListItem';

type AwardsListProps = {
  activeAward: AwardEntity | null;
  awards: AwardEntity[];
  form?: Readonly<React.ReactNode>;
  loading?: boolean;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDragEnd?: (data: AwardEntity[]) => void;
};

const AwardsList = (props: AwardsListProps) => {
  const {
    activeAward,
    awards,
    form,
    loading = false,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
    onDragEnd,
  } = props;

  if (awards.length === 0) return null;

  return (
    <CardsList items={awards} draggable={awards.length > 1} loading={loading} onDragEnd={onDragEnd}>
      {(draggable) => (
        <>
          {awards.map((award) => (
            <AwardCardListItem
              key={award.id}
              award={award}
              draggable={draggable}
              editing={activeAward?.id === award.id}
              form={form}
              editDisabled={editDisabled}
              deleteLoading={deleteLoading}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </CardsList>
  );
};

export default AwardsList;
