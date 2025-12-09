'use client';

import { isDragAndDropDisabled } from '@/src/shared';
import { DragAndDropListener, DraggableComponent, Typography } from '@/src/shared/ui';

type PreviewItemProps = {
  id: string;
  totalItemsCount: number;
  text: string;
  isDisabled?: boolean;
};

export const PreviewItem = (props: PreviewItemProps) => {
  const { id, text, totalItemsCount } = props;

  return (
    <DraggableComponent id={id}>
      {({ attributes, listeners, style, ref }) => (
        <Typography
          component="li"
          className="flex min-h-6 items-center gap-2 hover:[&>button>span>svg]:opacity-100 hover:[&>svg]:opacity-100"
          ref={ref}
          style={style}
          {...attributes}
        >
          <DragAndDropListener isDisabled={isDragAndDropDisabled(totalItemsCount)} listeners={listeners} />
          {text}
        </Typography>
      )}
    </DraggableComponent>
  );
};
