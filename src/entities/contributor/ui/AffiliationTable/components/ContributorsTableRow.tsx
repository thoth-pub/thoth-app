'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { AnimatePresence } from 'motion/react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { convertOrchidIdToText, convertRorIdToText } from '@/src/shared';
import { OrchidLogo, RorLogo, TableCell, TableRow } from '@/src/shared/ui';

import { ContributorEditForm } from './ContributorEditForm';
import { LinkTooltip } from './LinkTooltip';
import { RowButtonGroup } from './RowButtonGroup';

type ContributorsTableRowProps = {
  isEditing: boolean;
  onCloseEdit: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  item: WorkContribution;
};

export const ContributorsTableRow = (props: ContributorsTableRowProps) => {
  const {
    isEditing,
    item: { id, fullName, type, isMain, orchidId, biography, affiliations },
    onCloseEdit,
    onEdit,
    onDelete,
    onSelectAsMain,
  } = props;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <TableRow onDoubleClick={onCloseEdit} className="w-full bg-[var(--color-table-edit-row-form-background)]">
          <TableCell colSpan={4} className="rounded-2xl">
            <ContributorEditForm onClose={onCloseEdit} name={fullName} orchidId={orchidId} />
          </TableCell>
        </TableRow>
      ) : (
        <TableRow
          ref={setNodeRef}
          style={style}
          onDoubleClick={() => onEdit?.(id)}
          className="hover:[&>td>div>button]:opacity-100 hover:[&>td>div>svg]:opacity-100"
          {...attributes}
        >
          <TableCell className="rounded-tl-2xl rounded-bl-2xl pl-1 font-bold">
            <div className="flex gap-1">
              <DragIndicatorIcon className="opacity-0" {...listeners} />
              <div className="flex shrink-0 gap-1">
                {fullName}
                {orchidId && (
                  <LinkTooltip link={orchidId} linkText={convertOrchidIdToText(orchidId)}>
                    <OrchidLogo />
                  </LinkTooltip>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="capitalize">{type.toLowerCase()}</TableCell>
          <TableCell>
            <div className="flex">
              <ul>
                {affiliations.map((affiliation) => (
                  <li key={affiliation.name}>
                    {affiliation.name}
                    {affiliation.rorId && (
                      <LinkTooltip link={affiliation.rorId} linkText={convertRorIdToText(affiliation.rorId)}>
                        <RorLogo />
                      </LinkTooltip>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TableCell>
          <TableCell className="flex justify-between rounded-tr-2xl rounded-br-2xl">
            {biography}
            <RowButtonGroup
              className="ml-auto"
              isSelected={isMain}
              onEdit={() => onEdit?.(id)}
              onSelect={() => onSelectAsMain?.(id)}
            />
          </TableCell>
        </TableRow>
      )}
    </AnimatePresence>
  );
};
