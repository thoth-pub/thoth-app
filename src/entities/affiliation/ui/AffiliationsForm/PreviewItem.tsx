'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { Typography } from '@/src/shared/ui';

type PreviewItemProps = {
  id: string;
  text: string;
  isDisabled?: boolean;
};

export const PreviewItem = (props: PreviewItemProps) => {
  const { id, text, isDisabled = false } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Typography
      component="li"
      className="flex min-h-6 items-center gap-2 hover:[&>button>span>svg]:opacity-100 hover:[&>svg]:opacity-100"
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
      {text}
    </Typography>
  );
};
