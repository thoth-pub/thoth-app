import ArticleIcon from '@mui/icons-material/Article';

import { ButtonGroup, CardListItem, DeleteButton, DoiPreview, EditButton, Typography } from '@/src/shared/ui';

import { ReferenceEntity } from '../../../model/reference.types';

type ReferenceCardListItemProps = {
  reference: ReferenceEntity;
  draggable?: boolean;
  editing?: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const ReferenceCardListItem = (props: ReferenceCardListItemProps) => {
  const { reference, draggable, editing, form, editDisabled = false, onDelete, onEdit } = props;

  const { id, orderNumber, unstructuredCitation, doi } = reference;

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      actions={
        <ButtonGroup>
          <EditButton onClick={() => onEdit?.(id)} disabled={editDisabled} />
          <DeleteButton onClick={() => onDelete?.(id)} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="cardItem normal-case">
        <ArticleIcon fontSize="small" color="primary" />
        {orderNumber} {unstructuredCitation}
      </Typography>
      <Typography>{doi && doi.length > 0 && <DoiPreview doi={doi} />}</Typography>
    </CardListItem>
  );
};
