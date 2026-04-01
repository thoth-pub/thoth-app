import { CardsList } from '@/src/shared/ui';

import { EndorsementEntity } from '../../model/endorsement.types';
import { EndorsementCardListItem } from './components/EndorsementCardListItem';

type EndorsementsListProps = {
  activeEndorsement: EndorsementEntity | null;
  endorsements: EndorsementEntity[];
  form?: Readonly<React.ReactNode>;
  loading?: boolean;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDragEnd?: (data: EndorsementEntity[]) => void;
};

const EndorsementsList = (props: EndorsementsListProps) => {
  const {
    activeEndorsement,
    endorsements,
    form,
    loading = false,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
    onDragEnd,
  } = props;

  if (endorsements.length === 0) return null;

  return (
    <CardsList items={endorsements} draggable={endorsements.length > 1} loading={loading} onDragEnd={onDragEnd}>
      {(draggable) => (
        <>
          {endorsements.map((endorsement) => (
            <EndorsementCardListItem
              key={endorsement.id}
              endorsement={endorsement}
              draggable={draggable}
              editing={activeEndorsement?.id === endorsement.id}
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

export default EndorsementsList;
