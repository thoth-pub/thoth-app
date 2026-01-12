'use client';

import { Typography } from '@mui/material';

import { isDragAndDropDisabled } from '@/src/shared';
import { DeleteButton, DragAndDropListener, DraggableComponent, MarkdownRenderer } from '@/src/shared/ui';

type ListItemProps = {
  id: string;
  name: string;
  totalItemsCount: number;
  orderNumber: number;
  withDelete?: boolean;
  onDelete?: (id: string) => void;
};

export const ListItem = (props: ListItemProps) => {
  const { id, name, orderNumber, totalItemsCount, withDelete = false, onDelete } = props;

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
          {orderNumber}. <MarkdownRenderer markdown={name} />
          {withDelete && (
            <DeleteButton className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
          )}
        </Typography>
      )}
    </DraggableComponent>
  );
};
