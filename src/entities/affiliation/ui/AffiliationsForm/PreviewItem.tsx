'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { isDragAndDropDisabled } from '@/src/shared';
import { DragAndDropListener, Typography } from '@/src/shared/ui';

type PreviewItemProps = {
  id: string;
  totalItemsCount: number;
  text: string;
  isDisabled?: boolean;
};

export const PreviewItem = (props: PreviewItemProps) => {
  const { id, text, totalItemsCount } = props;

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
      <DragAndDropListener isDisabled={isDragAndDropDisabled(totalItemsCount)} listeners={listeners} />
      {text}
    </Typography>
  );
};
