import { Activity } from 'react';

import {
  AccessibilityExceptionType,
  AccessibilityStandardType,
  isAccessibilityStandardAvailable,
  isAdditionalAccessibilityStandardAvailable,
  isDimensionsAvailable,
} from '@/src/shared';
import { TableFormsHeader, TableFormsWrapper, TableNewEntityFormWrapper } from '@/src/shared/ui';

import type { PublicationDimensionsForm, PublicationType } from '../../model/publication.types';
import { EditAccessibilityAdditionalStandard } from './components/EditAccessibilityAdditionalStandard';
import { EditAccessibilityException } from './components/EditAccessibilityException';
import { EditAccessibilityReport } from './components/EditAccessibilityReport';
import { EditAccessibilityStandard } from './components/EditAccessibilityStandard';
import { EditDimensions } from './components/EditDimensions';
import EditIsbn from './components/EditIsbn';
import EditPublicationType from './components/EditPublicationType';

type EditPublicationProps = {
  publicationType: PublicationType;
  isbn: string;
  width: number;
  widthIn: number;
  height: number;
  heightIn: number;
  depth: number;
  depthIn: number;
  weight: number;
  weightOz: number;
  accessibilityStandard: AccessibilityStandardType | null;
  accessibilityAdditionalStandard: AccessibilityStandardType | null;
  accessibilityException: AccessibilityExceptionType | null;
  accessibilityReportUrl: string;
  isDimensionFormHidden: boolean;
  children?: Readonly<React.ReactNode>;
  onDone?: () => void;
  onClose?: () => void;
  onUpdateType?: (type: PublicationType) => void;
  onUpdateIsbn?: (isbn: string) => void;
  onUpdateDimensions?: (dimensions: PublicationDimensionsForm) => void;
  onUpdateAccessibilityStandard?: (standard: AccessibilityStandardType) => void;
  onUpdateAccessibilityAdditionalStandard?: (standard: AccessibilityStandardType) => void;
  onUpdateAccessibilityException?: (exception: AccessibilityExceptionType) => void;
  onUpdateAccessibilityReport?: (report: string) => void;
  onDeleteAccessibility?: () => void;
};

const EditPublication = (props: EditPublicationProps) => {
  const {
    publicationType,
    isbn,
    width,
    widthIn,
    height,
    heightIn,
    depth,
    depthIn,
    weight,
    weightOz,
    isDimensionFormHidden,
    accessibilityStandard,
    accessibilityAdditionalStandard,
    accessibilityException,
    accessibilityReportUrl,
    children,
    onDone,
    onClose,
    onUpdateType,
    onUpdateIsbn,
    onUpdateDimensions,
    onUpdateAccessibilityStandard,
    onUpdateAccessibilityAdditionalStandard,
    onUpdateAccessibilityException,
    onUpdateAccessibilityReport,
    onDeleteAccessibility,
  } = props;

  const isDimensionsHidden = isDimensionFormHidden || !isDimensionsAvailable(publicationType);
  const isAccessabilitySectionAvailable = isAccessibilityStandardAvailable(publicationType);
  const isAdditionalStandardAvailable = isAdditionalAccessibilityStandardAvailable(publicationType);

  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title={publicationType} onDone={onDone} onClose={onClose} />
        <EditPublicationType publicationType={publicationType} onSubmit={onUpdateType} />
        <EditIsbn isbn={isbn} onSubmit={onUpdateIsbn} />
        {!isDimensionsHidden && (
          <EditDimensions
            width={width}
            widthIn={widthIn}
            height={height}
            heightIn={heightIn}
            depth={depth}
            depthIn={depthIn}
            weight={weight}
            weightOz={weightOz}
            onSubmit={onUpdateDimensions}
          />
        )}
        {isAccessabilitySectionAvailable && (
          <>
            <Activity mode={isAdditionalStandardAvailable ? 'hidden' : 'visible'}>
              <EditAccessibilityStandard
                standard={accessibilityStandard}
                onSubmit={onUpdateAccessibilityStandard}
                onDelete={onDeleteAccessibility}
              />
            </Activity>

            <Activity mode={isAdditionalStandardAvailable ? 'visible' : 'hidden'}>
              <EditAccessibilityAdditionalStandard
                publicationType={publicationType}
                standard={accessibilityAdditionalStandard}
                onSubmit={onUpdateAccessibilityAdditionalStandard}
                onDelete={onDeleteAccessibility}
              />
            </Activity>

            <EditAccessibilityException
              exception={accessibilityException}
              onSubmit={onUpdateAccessibilityException}
              onDelete={onDeleteAccessibility}
            />

            <EditAccessibilityReport report={accessibilityReportUrl} onSubmit={onUpdateAccessibilityReport} />
          </>
        )}
        {children}
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditPublication;
