'use client';

import type { DraggableAttributes, UniqueIdentifier } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type DraggableComponentProps = {
  id: UniqueIdentifier;
  children: (props: {
    attributes: DraggableAttributes;
    listeners?: SyntheticListenerMap;
    style: React.CSSProperties;
    ref: (node: HTMLElement | null) => void;
  }) => React.ReactNode;
};

const DraggableComponent = (props: DraggableComponentProps) => {
  const { id, children } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return <>{children({ attributes, listeners, style, ref: setNodeRef })}</>;
};

export default DraggableComponent;
