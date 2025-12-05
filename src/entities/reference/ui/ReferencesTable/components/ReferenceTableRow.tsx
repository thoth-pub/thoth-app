import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DoiPreview, DraggableComponent, TableCell, TableRow } from '@/src/shared/ui';

import { RowButtonGroup } from './RowButtonGroup';
import type { ReferenceEntity } from '../../../model/reference.types';

type ReferenceTableRowProps = {
  reference: ReferenceEntity;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const ReferenceTableRow = (props: ReferenceTableRowProps) => {
  const { reference, onDelete, onEdit } = props;

  const { id, orderNumber, unstructuredCitation, doi } = reference;

  return (
    <DraggableComponent id={id}>
      {({ attributes, listeners, style, ref }) => (
        <TableRow className="group" ref={ref} style={style} {...attributes}>
          <TableCell className="firstCell">
            <div className="flex items-center gap-1">
              <DragIndicatorIcon
                {...listeners}
                className="my-auto opacity-0 group-hover:opacity-100"
                color="primary"
                fontSize="small"
              />
              {orderNumber}
            </div>
          </TableCell>
          <TableCell className="middleCell">{unstructuredCitation}</TableCell>
          <TableCell className="lastCell">
            <div className="flex justify-between">
              {doi && doi.length > 0 && <DoiPreview doi={doi} />}
              <RowButtonGroup className="ml-auto" onDelete={() => onDelete?.(id)} onEdit={() => onEdit?.(id)} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </DraggableComponent>
  );
};
