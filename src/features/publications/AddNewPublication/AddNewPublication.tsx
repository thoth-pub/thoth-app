'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication } from '@/src/entities/publication';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

import { useAddNewPublication } from './useAddNewPublication';

type AddNewPublicationProps = BaseRecommendedSectionProps & {
  isDimensionFormHidden: boolean;
  isUploadFileFormDisabled: boolean;
};

const AddNewPublication = (props: AddNewPublicationProps) => {
  const { workId, isDimensionFormHidden = false, isUploadFileFormDisabled = true } = props;

  const {
    publication,
    loading,
    defaultCurrencyOption,
    finishEditing,
    create,
    updateIsbn,
    updateType,
    updateDimensions,
    updatePrices,
    updateLocations,
    deleteLocation,
    updateAccessibilityStandards,
    updateAccessibilityException,
    updateAccessibilityReport,
    deleteAccessibility,
    updateFile,
  } = useAddNewPublication({
    workId,
  });

  if (!publication) return null;

  const {
    type,
    isbn,
    width,
    height,
    depth,
    weight,
    widthIn,
    heightIn,
    depthIn,
    weightOz,
    accessibilityStandard,
    accessibilityAdditionalStandard,
    accessibilityException,
    accessibilityReportUrl,
  } = publication;

  const accessibilityStandards = [accessibilityStandard, accessibilityAdditionalStandard].filter(
    (standard) => !!standard,
  );

  return (
    <TableNewEntityFormWrapper>
      <EditPublication
        publicationType={type}
        isDimensionFormHidden={isDimensionFormHidden}
        isbn={isbn}
        width={width}
        widthIn={widthIn}
        height={height}
        heightIn={heightIn}
        depth={depth}
        depthIn={depthIn}
        weight={weight}
        weightOz={weightOz}
        accessibilityStandards={accessibilityStandards}
        accessibilityException={accessibilityException}
        accessibilityReportUrl={accessibilityReportUrl}
        fileUrl=""
        loading={loading}
        isUploadFileFormDisabled={isUploadFileFormDisabled}
        onUpdateIsbn={updateIsbn}
        onUpdateType={updateType}
        onClose={finishEditing}
        onDone={create}
        onUpdateDimensions={updateDimensions}
        onUpdateAccessibilityStandards={updateAccessibilityStandards}
        onUpdateAccessibilityException={updateAccessibilityException}
        onUpdateAccessibilityReport={updateAccessibilityReport}
        onDeleteAccessibility={deleteAccessibility}
        onUpdateFile={updateFile}
      >
        {(isFullTextUrlHidden) => (
          <>
            <EditPrice
              defaultCurrencyOption={defaultCurrencyOption}
              onUpdate={updatePrices}
              onClose={finishEditing}
              prices={publication.prices}
            />
            <EditLocations
              locations={publication.locations}
              onUpdate={updateLocations}
              onDelete={deleteLocation}
              isFullTextUrlHidden={isFullTextUrlHidden}
            />
          </>
        )}
      </EditPublication>
    </TableNewEntityFormWrapper>
  );
};

export default AddNewPublication;
