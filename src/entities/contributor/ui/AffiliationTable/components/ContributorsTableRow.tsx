'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { AnimatePresence } from 'motion/react';

import { convertOrchidIdToText, convertRorIdToText } from '@/src/shared';
import { OrchidLogo, RorLogo, TableCell, TableRow } from '@/src/shared/ui';

import { ContributorEditForm } from './ContributorEditForm';
import { LinkTooltip } from './LinkTooltip';
import { RowButtonGroup } from './RowButtonGroup';

type ContributorsTableRowProps = {
  isEditing: boolean;
  mainContributor: string;
  onCloseEdit: () => void;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  onSelectAsMain: (name: string) => void;
  item: {
    id: string;
    name: string;
    type: string;
    institution: string;
    bio: string;
    rorId?: string;
    orchidId?: string;
  };
};

export const ContributorsTableRow = (props: ContributorsTableRowProps) => {
  const { isEditing, mainContributor, item, onCloseEdit, onEdit, onDelete, onSelectAsMain } = props;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <TableRow onDoubleClick={onCloseEdit} className="w-full bg-[var(--color-table-edit-row-form-background)]">
          <TableCell colSpan={4} className="rounded-2xl">
            <ContributorEditForm onClose={onCloseEdit} name={item.name} orchidId={item.orchidId} />
          </TableCell>
        </TableRow>
      ) : (
        <TableRow
          ref={setNodeRef}
          style={style}
          onDoubleClick={() => onEdit?.(item.name)}
          className="hover:[&>td>div>button]:opacity-100 hover:[&>td>div>svg]:opacity-100"
          {...attributes}
        >
          <TableCell className="rounded-tl-2xl rounded-bl-2xl pl-1 font-bold">
            <div className="flex gap-1">
              <DragIndicatorIcon className="opacity-0" {...listeners} />
              <div className="flex shrink-0 gap-1">
                {item.name}
                {item.orchidId && (
                  <LinkTooltip link={item.orchidId} linkText={convertOrchidIdToText(item.orchidId)}>
                    <OrchidLogo />
                  </LinkTooltip>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>{item.type}</TableCell>
          <TableCell>
            <div className="flex">
              {item.institution}{' '}
              {item.rorId && (
                <LinkTooltip link={item.rorId} linkText={convertRorIdToText(item.rorId)}>
                  <RorLogo />
                </LinkTooltip>
              )}
            </div>
          </TableCell>
          <TableCell className="flex justify-between rounded-tr-2xl rounded-br-2xl">
            {item.bio}
            <RowButtonGroup
              isSelected={mainContributor === item.name}
              onEdit={() => onEdit?.(item.name)}
              onSelect={() => onSelectAsMain?.(item.name)}
            />
          </TableCell>
        </TableRow>
      )}
    </AnimatePresence>
  );
};
