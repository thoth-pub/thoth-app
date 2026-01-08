import { Activity } from 'react';

import {
  AccessibilityExceptionType,
  AccessibilityStandardType,
  isAccessibilityStandardAvailable,
  isDimensionsAvailable,
} from '@/src/shared';
import { TableFormsHeader, TableFormsWrapper, Typography } from '@/src/shared/ui';

import type { PublicationDimensionsForm, PublicationType } from '../../model/publication.types';
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
  accessibilityStandards: AccessibilityStandardType[];
  accessibilityException: AccessibilityExceptionType | null;
  accessibilityReportUrl: string;
  isDimensionFormHidden: boolean;
  children?: Readonly<React.ReactNode>;
  onDone?: () => void;
  onClose?: () => void;
  onUpdateType?: (type: PublicationType) => void;
  onUpdateIsbn?: (isbn: string) => void;
  onUpdateDimensions?: (dimensions: PublicationDimensionsForm) => void;
  onUpdateAccessibilityStandards?: (standards: AccessibilityStandardType[]) => void;
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
    accessibilityStandards = [],
    accessibilityException,
    accessibilityReportUrl,
    children,
    onDone,
    onClose,
    onUpdateType,
    onUpdateIsbn,
    onUpdateDimensions,
    onUpdateAccessibilityStandards,
    onUpdateAccessibilityException,
    onUpdateAccessibilityReport,
    onDeleteAccessibility,
  } = props;

  const isDimensionsHidden = isDimensionFormHidden || !isDimensionsAvailable(publicationType);
  const isAccessabilitySectionAvailable = isAccessibilityStandardAvailable(publicationType);

  return (
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

      {children}

      <Activity mode={isAccessabilitySectionAvailable ? 'visible' : 'hidden'}>
        <div className="flex flex-col gap-8">
          <Typography component="h2" variant="h2">
            Accessibility
          </Typography>

          <EditAccessibilityStandard
            publicationType={publicationType}
            standards={accessibilityStandards}
            onSubmit={onUpdateAccessibilityStandards}
            onDelete={onDeleteAccessibility}
          />

          <EditAccessibilityException
            exception={accessibilityException}
            onSubmit={onUpdateAccessibilityException}
            onDelete={onDeleteAccessibility}
          />

          <EditAccessibilityReport report={accessibilityReportUrl} onSubmit={onUpdateAccessibilityReport} />
        </div>
      </Activity>
    </TableFormsWrapper>
  );
};

export default EditPublication;
