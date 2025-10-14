'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import removeMd from 'remove-markdown';

import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { appConfig, convertOrchidIdToText, convertRorIdToText, truncateString } from '@/src/shared';
import { Indicator, LinkTooltip, OrchidLogo, RorLogo, TableCell, TableRow, Typography } from '@/src/shared/ui';

import { RowButtonGroup } from './RowButtonGroup';

const { maxPreviewLength } = appConfig.tables;

type ContributionsTableRowProps = {
  contributor: WorkContribution;
  form: Readonly<React.ReactNode>;
  isEditing: boolean;
  isEditable: boolean;
  showRecommendations: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelectAsMain?: (id: string) => void;
};

export const ContributionsTableRow = (props: ContributionsTableRowProps) => {
  const {
    contributor: { id, fullName, type, isMain, orcidId, biography, affiliations },
    form,
    isEditing,
    isEditable = true,
    showRecommendations,
    onEdit,
    onDelete,
    onSelectAsMain,
  } = props;
  const { t } = useTranslation();
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
          <TableCell colSpan={4} className="rounded-2xl border-1 border-[var(--color-form-border)]">
            {form}
          </TableCell>
        </TableRow>
      ) : (
        <TableRow ref={setNodeRef} style={style} onDoubleClick={() => onEdit?.(id)} className="group" {...attributes}>
          <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-1 group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
            <div className="flex gap-1">
              <DragIndicatorIcon className="my-auto opacity-0" color="primary" fontSize="small" {...listeners} />
              <div className="flex shrink flex-wrap items-center gap-1">
                {fullName}
                {orcidId && (
                  <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                    <OrchidLogo />
                  </LinkTooltip>
                )}
                {showRecommendations && (!biography || affiliations.length === 0) && <Indicator />}
              </div>
            </div>
          </TableCell>
          <TableCell className="border-1 border-r-0 border-l-0 border-transparent capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
            {t(type.toLowerCase().replace('_', ' '))}
          </TableCell>
          <TableCell className="border-1 border-r-0 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
            <div className="flex rounded-tr-2xl rounded-br-2xl">
              <ul className="flex flex-col gap-1">
                {affiliations.map(({ id, institutionName, rorId }) => (
                  <li key={id} className="flex items-center justify-between gap-1">
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
          <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
            <div className="flex justify-between">
              <Typography>{truncatedBiography}</Typography>
              <RowButtonGroup
                className="ml-auto"
                isSelected={isMain}
                isDisabled={!isEditable}
                onEdit={() => onEdit?.(id)}
                onSelectAsMain={() => onSelectAsMain?.(id)}
                onDelete={() => onDelete?.(id)}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </AnimatePresence>
  );
};
