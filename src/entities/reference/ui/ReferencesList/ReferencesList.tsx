import { CardsList } from '@/src/shared/ui';

import type { ReferenceEntity } from '../../model/reference.types';
import { ReferenceCardListItem } from './components/ReferenceCardListItem';

type ReferencesListProps = {
  activeReference: ReferenceEntity | null;
  references: ReferenceEntity[];
  form: Readonly<React.ReactNode>;
  loading?: boolean;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDragEnd?: (data: ReferenceEntity[]) => void;
};

const ReferencesList = (props: ReferencesListProps) => {
  const {
    activeReference,
    references,
    form,
    loading = false,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
    onDragEnd,
  } = props;

  return (
    <CardsList items={references} draggable={references.length > 1} loading={loading} onDragEnd={onDragEnd}>
      {(draggable) => (
        <>
          {references.map((reference) => (
            <ReferenceCardListItem
              key={reference.id}
              reference={reference}
              draggable={draggable}
              editing={activeReference?.id === reference.id}
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

export default ReferencesList;
