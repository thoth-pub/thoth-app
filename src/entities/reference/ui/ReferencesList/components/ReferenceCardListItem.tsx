import { CardListItem, DeleteButton, DoiPreview, Typography } from '@/src/shared/ui';

import { ReferenceEntity } from '../../../model/reference.types';

type ReferenceCardListItemProps = {
  reference: ReferenceEntity;
  draggable?: boolean;
  editing?: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const ReferenceCardListItem = (props: ReferenceCardListItemProps) => {
  const { reference, draggable, editing, form, editDisabled = false, deleteLoading = false, onDelete, onEdit } = props;

  const { id, orderNumber, unstructuredCitation, doi } = reference;

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit reference"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      <Typography className="cardItem normal-case">
        {orderNumber}. {unstructuredCitation}
      </Typography>
      {doi && doi.length > 0 && <DoiPreview doi={doi} />}
    </CardListItem>
  );
};
