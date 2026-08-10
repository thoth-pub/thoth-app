'use client';

import { DragAndDropListener, DraggableComponent, RorLink, Typography } from '@/src/shared/ui';
import { isDragAndDropDisabled } from '@/src/shared/utils';

type PreviewItemProps = {
  id: string;
  totalItemsCount: number;
  text: string;
  rorId?: string;
  isDisabled?: boolean;
};

export const PreviewItem = (props: PreviewItemProps) => {
  const { id, text, rorId, totalItemsCount } = props;

  return (
    <DraggableComponent id={id}>
      {({ attributes, listeners, style, ref }) => (
        <Typography
          component="li"
          className="flex min-h-6 items-center group-hover:gap-2 hover:[&>button>span>svg]:opacity-100 hover:[&>svg]:opacity-100"
          ref={ref}
          style={style}
          {...attributes}
        >
          <DragAndDropListener isDisabled={isDragAndDropDisabled(totalItemsCount)} listeners={listeners} />
          {text}
          {rorId && <RorLink rorId={rorId} />}
        </Typography>
      )}
    </DraggableComponent>
  );
};
