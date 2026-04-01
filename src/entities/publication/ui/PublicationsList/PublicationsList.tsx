import { CardsList } from '@/src/shared/ui';

import type { PublicationEntity } from '../../model/publication.types';
import { PublicationCardListItem } from './components/PublicationCardListItem';

type PublicationsListProps = {
  activePublication: PublicationEntity | null;
  publications: PublicationEntity[];
  form: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const PublicationsList = (props: PublicationsListProps) => {
  const {
    activePublication,
    publications,
    form,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
  } = props;

  return (
    <CardsList items={publications}>
      {() => (
        <>
          {publications.map((publication) => (
            <PublicationCardListItem
              key={publication.id}
              publication={publication}
              editing={activePublication?.id === publication.id}
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

export default PublicationsList;
