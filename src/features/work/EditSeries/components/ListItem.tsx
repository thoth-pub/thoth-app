'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Typography } from '@mui/material';

type ListItemProps = {
  id: string;
  name: string;
  orderNumber: number;
  isDisabled?: boolean;
};

export const ListItem = (props: ListItemProps) => {
  const { id, name, orderNumber, isDisabled = false } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Typography
      component="li"
      className="flex w-full items-center gap-2 rounded-xl border-1 border-transparent p-4 hover:border-[var(--color-form-border)]"
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <DragIndicatorIcon
        className={`my-auto ${isDisabled ? '!opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
        color="primary"
        fontSize="small"
        {...listeners}
      />
      {orderNumber}. {name}
    </Typography>
  );
};
