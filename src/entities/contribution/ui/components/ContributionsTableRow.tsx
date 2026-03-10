'use client';

import { AnimatePresence } from 'motion/react';
import removeMd from 'remove-markdown';

import { appConfig } from '@/src/shared/config';
import {
  DragAndDropListener,
  DraggableComponent,
  Indicator,
  LinkTooltip,
  OrchidLogo,
  RorLogo,
  TableCell,
  TableFormWrapper,
  TableRow,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { convertOrchidIdToText, convertRorIdToText, isDragAndDropDisabled, truncateString } from '@/src/shared/utils';

import type { WorkContribution } from '../../model/contribution.types';
import { RowButtonGroup } from './RowButtonGroup';

const { maxPreviewLength } = appConfig.tables;

type ContributionsTableRowProps = {
  contributor: WorkContribution;
  form: Readonly<React.ReactNode>;
  totalContributionsCount: number;
  isEditing: boolean;
  isEditable: boolean;
  showRecommendations: boolean;
  deleteLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export const ContributionsTableRow = (props: ContributionsTableRowProps) => {
  const {
    contributor: { id, fullName, type, orcidId, biographies, affiliations },
    form,
    isEditing,
    isEditable = true,
    showRecommendations,
    totalContributionsCount,
    deleteLoading = false,
    onEdit,
    onDelete,
  } = props;

  const canonicalBiography =
    biographies.filter((bio) => bio.contributionId === id).find((bio) => bio.canonical)?.content ?? '';
  const plainText = removeMd(canonicalBiography);
  const truncatedBiography = truncateString(plainText, maxPreviewLength);

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <TableFormWrapper colSpan={4}>{form}</TableFormWrapper>
      ) : (
        <DraggableComponent id={id}>
          {({ attributes, listeners, style, ref }) => (
            <TableRow ref={ref} style={style} onDoubleClick={() => onEdit?.(id)} className="group" {...attributes}>
              <TableCell className="firstCell">
                <div className="flex gap-1">
                  <DragAndDropListener
                    isDisabled={isDragAndDropDisabled(totalContributionsCount)}
                    listeners={listeners}
                  />
                  <div className="flex shrink flex-wrap items-center gap-1">
                    {fullName}
                    {orcidId && (
                      <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                        <OrchidLogo />
                      </LinkTooltip>
                    )}
                    {showRecommendations && (biographies.length === 0 || affiliations.length === 0) && <Indicator />}
                  </div>
                </div>
              </TableCell>
              <TableCell className="middleCell">
                <TranslatedContent content={type.toLowerCase().replace('_', ' ')} />
              </TableCell>
              <TableCell className="middleCell">
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
              <TableCell className="lastCell">
                <div className="flex justify-between">
                  <Typography>{truncatedBiography}</Typography>
                  <RowButtonGroup
                    className="ml-auto"
                    isDisabled={!isEditable}
                    deleteLoading={deleteLoading}
                    onEdit={() => onEdit?.(id)}
                    onDelete={() => onDelete?.(id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          )}
        </DraggableComponent>
      )}
    </AnimatePresence>
  );
};
