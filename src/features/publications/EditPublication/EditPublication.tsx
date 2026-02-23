'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication as EditPublicationForm } from '@/src/entities/publication';
import type { BaseEditSectionProps } from '@/src/shared';

import { useEditPublication } from './useEditPublication';

type EditPublicationProps = BaseEditSectionProps & {
  isDimensionFormHidden: boolean;
  isUploadFileFormDisabled: boolean;
};

const EditPublication = (props: EditPublicationProps) => {
  const { workId, isDimensionFormHidden = false, isUploadFileFormDisabled = true } = props;

  const {
    activePublication,
    loading,
    close,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
    updateLocations,
    deleteLocation,
    updateAccessibilityStandards,
    updateAccessibilityException,
    updateAccessibilityReport,
    deleteAccessibility,
    updateFile,
  } = useEditPublication({
    workId,
  });

  if (!activePublication) return null;

  const accessibilityStandards = [
    activePublication.accessibilityStandard,
    activePublication.accessibilityAdditionalStandard,
  ].filter((standard) => !!standard);

  return (
    <EditPublicationForm
      isDimensionFormHidden={isDimensionFormHidden}
      publicationType={activePublication.type}
      isbn={activePublication.isbn}
      width={activePublication.width}
      widthIn={activePublication.widthIn}
      height={activePublication.height}
      heightIn={activePublication.heightIn}
      depth={activePublication.depth}
      depthIn={activePublication.depthIn}
      weight={activePublication.weight}
      weightOz={activePublication.weightOz}
      accessibilityStandards={accessibilityStandards}
      accessibilityException={activePublication.accessibilityException}
      accessibilityReportUrl={activePublication.accessibilityReportUrl}
      fileUrl={activePublication.fileUrl ?? ''}
      isUploadFileFormDisabled={isUploadFileFormDisabled}
      loading={loading}
      onUpdateIsbn={updateIsbn}
      onUpdateType={updateType}
      onDone={close}
      onClose={close}
      onUpdateDimensions={updateSizes}
      onUpdateAccessibilityStandards={updateAccessibilityStandards}
      onUpdateAccessibilityException={updateAccessibilityException}
      onUpdateAccessibilityReport={updateAccessibilityReport}
      onDeleteAccessibility={deleteAccessibility}
      onUpdateFile={updateFile}
    >
      {(isFullTextUrlHidden) => (
        <>
          <EditPrice prices={activePublication.prices} onUpdate={updatePrices} onClose={close} />
          <EditLocations
            locations={activePublication.locations}
            isFullTextUrlHidden={isFullTextUrlHidden}
            onUpdate={updateLocations}
            onDelete={deleteLocation}
          />
        </>
      )}
    </EditPublicationForm>
  );
};

export default EditPublication;
