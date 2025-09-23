'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { EditButton } from '@/src/shared/ui';

type AffiliationsPreviewItemProps = {
  id: string;
  text: string;
  onSwitchMode: () => void;
};

export const AffiliationsPreviewItem = (props: AffiliationsPreviewItemProps) => {
  const { id, text, onSwitchMode } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li className="flex items-center gap-2" ref={setNodeRef} style={style} {...attributes}>
      <DragIndicatorIcon className="my-auto" color="primary" fontSize="small" {...listeners} />
      <EditButton isEmpty={false} placeholder="Edit Affiliation" onEdit={onSwitchMode} />
      {text}
    </li>
  );
};
