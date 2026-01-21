'use client';

import EditSquareIcon from '@mui/icons-material/EditSquare';
import { Chip, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { isDragAndDropDisabled, ROUTES } from '@/src/shared';
import {
  ButtonGroup,
  DeleteButton,
  DragAndDropListener,
  DraggableComponent,
  IconButton,
  MarkdownRenderer,
} from '@/src/shared/ui';

type ListItemProps = {
  id: string;
  name: string;
  totalItemsCount: number;
  orderNumber: number;
  workId: WorkId;
  withDelete?: boolean;
  onDelete?: (id: string) => void;
};

export const ListItem = (props: ListItemProps) => {
  const { id, name, orderNumber, totalItemsCount, workId, withDelete = false, onDelete } = props;

  const router = useRouter();

  const navigateToWork = (id: string) => {
    router.push(ROUTES.WORK_PAGE(id));
  };

  return (
    <DraggableComponent id={id}>
      {({ attributes, listeners, style, ref }) => (
        <Typography
          component="li"
          className="-ml-2 flex w-full items-center gap-2 rounded-xl border border-transparent py-2 hover:border-(--color-form-border)"
          ref={ref}
          style={style}
          {...attributes}
        >
          <DragAndDropListener isDisabled={isDragAndDropDisabled(totalItemsCount)} listeners={listeners} />
          <Chip label={orderNumber.toString()} size="small" className="mr-4" />
          <MarkdownRenderer markdown={name} />
          <ButtonGroup className="ml-auto">
            <IconButton onClick={() => navigateToWork(workId)}>
              <EditSquareIcon />
            </IconButton>
            {withDelete && (
              <DeleteButton className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
            )}
          </ButtonGroup>
        </Typography>
      )}
    </DraggableComponent>
  );
};
