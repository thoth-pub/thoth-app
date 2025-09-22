'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { AnimatePresence } from 'motion/react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { convertOrchidIdToText, convertRorIdToText, FormFieldOption } from '@/src/shared';
import { OrchidLogo, RorLogo, TableCell, TableRow } from '@/src/shared/ui';

import { ContributionType } from '../../../model/contributor.types';
import { ContributorEditForm } from './ContributorEditForm';
import { LinkTooltip } from './LinkTooltip';
import { RowButtonGroup } from './RowButtonGroup';

type ContributorsTableRowProps = {
  isEditing: boolean;
  contributor: WorkContribution;
  contributorTypeOptions: FormFieldOption[];
  isOrchidFieldDisabled?: boolean;
  isWebsiteUrlFieldDisabled?: boolean;
  onCloseEdit?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFullNameUpdate?: (fullName: string) => void;
  onLastNameUpdate?: (lastName: string) => void;
  onContributorTypeUpdate?: (contributorType: ContributionType) => void;
  onOrcidUpdate?: (orcid: string) => void;
  onWebsiteUrlUpdate?: (websiteUrl: string) => void;
  onSelectAsMain?: (id: string) => void;
};

export const ContributorsTableRow = (props: ContributorsTableRowProps) => {
  const {
    isEditing,
    contributor: { id, fullName, lastName, type, isMain, orchidId, biography, affiliations, website },
    contributorTypeOptions,
    isOrchidFieldDisabled = false,
    isWebsiteUrlFieldDisabled = false,
    onCloseEdit,
    onEdit,
    onDelete,
    onSelectAsMain,
    onFullNameUpdate,
    onLastNameUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onContributorTypeUpdate,
  } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <TableRow  className="w-full bg-[var(--color-table-edit-row-form-background)]">
          <TableCell colSpan={4} className="rounded-2xl">
            <ContributorEditForm
              onClose={onCloseEdit}
              fullName={fullName}
              lastName={lastName}
              contributorType={type}
              orchidId={orchidId}
              website={website}
              contributorTypeOptions={contributorTypeOptions}
              isOrchidFieldDisabled={isOrchidFieldDisabled}
              isWebsiteUrlFieldDisabled={isWebsiteUrlFieldDisabled}
              onFullNameUpdate={(fullName) => onFullNameUpdate?.(fullName)}
              onLastNameUpdate={(lastName) => onLastNameUpdate?.(lastName)}
              onContributorTypeUpdate={(contributorType) => onContributorTypeUpdate?.(contributorType)}
              onOrcidUpdate={(orcid) => onOrcidUpdate?.(orcid)}
              onWebsiteUrlUpdate={(websiteUrl) => onWebsiteUrlUpdate?.(websiteUrl)}
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
                {orchidId && (
                  <LinkTooltip link={orchidId} linkText={convertOrchidIdToText(orchidId)}>
                    <OrchidLogo />
                  </LinkTooltip>
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
