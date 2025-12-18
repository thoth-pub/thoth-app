'use client';

import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import removeMd from 'remove-markdown';

import {
  appConfig,
  convertOrchidIdToText,
  convertRorIdToText,
  isDragAndDropDisabled,
  truncateString,
} from '@/src/shared';
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
  Typography,
} from '@/src/shared/ui';

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
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelectAsMain?: (id: string) => void;
};

export const ContributionsTableRow = (props: ContributionsTableRowProps) => {
  const {
    contributor: { id, fullName, type, isMain, orcidId, biographies, affiliations },
    form,
    isEditing,
    isEditable = true,
    showRecommendations,
    totalContributionsCount,
    onEdit,
    onDelete,
    onSelectAsMain,
  } = props;
  const { t } = useTranslation();

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
              <TableCell className="middleCell">{t(type.toLowerCase().replace('_', ' '))}</TableCell>
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
        </DraggableComponent>
      )}
    </AnimatePresence>
  );
};
