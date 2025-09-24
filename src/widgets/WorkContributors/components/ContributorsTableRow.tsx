'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { AnimatePresence } from 'motion/react';
import removeMd from 'remove-markdown';

import { ContributionType } from '@/src/entities/contributor/model/contributor.types';
import { AffiliationsForm } from '@/src/entities/contributor/model/contributor.validation';
import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { appConfig, convertOrchidIdToText, convertRorIdToText, FormFieldOption, truncateString } from '@/src/shared';
import { OrchidLogo, RorLogo, TableCell, TableRow, Typography } from '@/src/shared/ui';

import { ContributorEditForm } from './ContributorEditForm';
import { LinkTooltip } from './LinkTooltip';
import { RowButtonGroup } from './RowButtonGroup';

const { maxPreviewLength } = appConfig.tables;

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
  onBiographyUpdate?: (biography: string) => void;
  onOrcidUpdate?: (orcid: string) => void;
  onWebsiteUrlUpdate?: (websiteUrl: string) => void;
  onSelectAsMain?: (id: string) => void;
  onAffiliationsReorder: (data: AffiliationsForm['affiliations']) => void;
  onAffiliationsUpdate: (data: AffiliationsForm) => void;
  onAffiliationsDelete: (id: string) => void;
};

export const ContributorsTableRow = (props: ContributorsTableRowProps) => {
  const {
    isEditing,
    contributor: { id, fullName, lastName, type, isMain, orcidId, biography, affiliations, website },
    contributorTypeOptions,
    isOrchidFieldDisabled = false,
    isWebsiteUrlFieldDisabled = false,
    onCloseEdit,
    onEdit,
    onDelete,
    onSelectAsMain,
    onFullNameUpdate,
    onLastNameUpdate,
    onBiographyUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onContributorTypeUpdate,
    onAffiliationsReorder,
    onAffiliationsUpdate,
    onAffiliationsDelete,
  } = props;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const plainText = removeMd(biography);
  const truncatedBiography = truncateString(plainText, maxPreviewLength);

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <TableRow className="w-full bg-[var(--color-table-edit-row-form-background)]">
          <TableCell colSpan={4} className="rounded-2xl">
            <ContributorEditForm
              onClose={onCloseEdit}
              fullName={fullName}
              lastName={lastName}
              contributorType={type}
              orcidId={orcidId}
              website={website}
              biography={biography}
              contributorTypeOptions={contributorTypeOptions}
              isOrchidFieldDisabled={isOrchidFieldDisabled}
              isWebsiteUrlFieldDisabled={isWebsiteUrlFieldDisabled}
              affiliations={affiliations}
              onFullNameUpdate={(fullName) => onFullNameUpdate?.(fullName)}
              onLastNameUpdate={(lastName) => onLastNameUpdate?.(lastName)}
              onBiographyUpdate={(biography) => onBiographyUpdate?.(biography)}
              onContributorTypeUpdate={(contributorType) => onContributorTypeUpdate?.(contributorType)}
              onOrcidUpdate={(orcid) => onOrcidUpdate?.(orcid)}
              onWebsiteUrlUpdate={(websiteUrl) => onWebsiteUrlUpdate?.(websiteUrl)}
              onAffiliationsReorder={onAffiliationsReorder}
              onAffiliationsUpdate={onAffiliationsUpdate}
              onAffiliationsDelete={onAffiliationsDelete}
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
          <TableCell className="w-50 rounded-tl-2xl rounded-bl-2xl pl-1">
            <div className="flex gap-1">
              <DragIndicatorIcon className="my-auto opacity-0" color="primary" fontSize="small" {...listeners} />
              <div className="flex shrink-0 gap-1">
                {fullName}
                {orcidId && (
                  <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                    <OrchidLogo />
                  </LinkTooltip>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="w-50 capitalize">{type.toLowerCase().replace('_', ' ')}</TableCell>
          <TableCell className="w-100">
            <div className="flex">
              <ul className="flex flex-col gap-1">
                {affiliations.map(({ id, institutionName, rorId }) => (
                  <li key={id} className="flex items-center gap-1">
                    {institutionName}
                    {rorId && (
                      <LinkTooltip link={rorId} linkText={convertRorIdToText(rorId)}>
                        <RorLogo />
                      </LinkTooltip>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TableCell>
          <TableCell className="flex justify-between rounded-tr-2xl rounded-br-2xl">
            <Typography>{truncatedBiography}</Typography>
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
