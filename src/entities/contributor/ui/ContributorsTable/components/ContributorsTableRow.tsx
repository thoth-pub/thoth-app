'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import { AnimatePresence } from 'motion/react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { convertOrchidIdToText, convertRorIdToText, FormFieldOption } from '@/src/shared';
import { Button, OrchidLogo, RorLogo, TableCell, TableRow, Tooltip } from '@/src/shared/ui';

import { ContributionType } from '../../../model/contributor.types';
import { ContributorEditForm } from './ContributorEditForm';
import { LinkTooltip } from './LinkTooltip';
import { RowButtonGroup } from './RowButtonGroup';

type ContributorsTableRowProps = {
  isEditing: boolean;
  contributor: WorkContribution;
  contributorTypeOptions: FormFieldOption[];
  onCloseEdit?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFullNameUpdate?: (fullName: string) => void;
  onContributorTypeUpdate?: (contributorType: ContributionType) => void;
  onSelectAsMain?: (id: string) => void;
  onEditProfile?: (id: string) => void;
};

export const ContributorsTableRow = (props: ContributorsTableRowProps) => {
  const {
    isEditing,
    contributor: { id, fullName, type, isMain, orchidId, biography, affiliations },
    contributorTypeOptions,
    onCloseEdit,
    onEdit,
    onDelete,
    onSelectAsMain,
    onFullNameUpdate,
    onContributorTypeUpdate,
    onEditProfile,
  } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <TableRow onDoubleClick={onCloseEdit} className="w-full bg-[var(--color-table-edit-row-form-background)]">
          <TableCell colSpan={4} className="rounded-2xl">
            <ContributorEditForm
              onClose={onCloseEdit}
              onFullNameUpdate={(fullName) => onFullNameUpdate?.(fullName)}
              onContributorTypeUpdate={(contributorType) => onContributorTypeUpdate?.(contributorType)}
              fullName={fullName}
              contributorType={type}
              orchidId={orchidId}
              contributorTypeOptions={contributorTypeOptions}
            />
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
                {orchidId ? (
                  <LinkTooltip link={orchidId} linkText={convertOrchidIdToText(orchidId)}>
                    <OrchidLogo />
                  </LinkTooltip>
                ) : (
                  <Tooltip
                    title={
                      <Button variant="text" startIcon={<EditIcon />} onClick={() => onEditProfile?.(id)}>
                        Edit record
                      </Button>
                    }
                    arrow
                    placement="right"
                  >
                    <AccountCircleIcon fontSize="small" className="m-auto" />
                  </Tooltip>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="capitalize">{type.toLowerCase().replace('_', ' ')}</TableCell>
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
              onSelectAsMain={() => onSelectAsMain?.(id)}
              onDelete={() => onDelete?.(id)}
            />
          </TableCell>
        </TableRow>
      )}
    </AnimatePresence>
  );
};
