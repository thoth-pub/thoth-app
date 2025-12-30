'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication } from '@/src/entities/publication';
import { BaseRecommendedSectionProps } from '@/src/shared';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

import { useAddNewPublication } from './useAddNewPublication';

type AddNewPublicationProps = BaseRecommendedSectionProps & {
  isDimensionFormHidden: boolean;
};

const AddNewPublication = (props: AddNewPublicationProps) => {
  const { workId, isDimensionFormHidden = false } = props;

  const {
    publication,
    close,
    create,
    updateIsbn,
    updateType,
    updateDimensions,
    updatePrices,
    updateLocations,
    updateAccessibilityStandard,
    updateAccessibilityAdditionalStandard,
    updateAccessibilityException,
    updateAccessibilityReport,
    deleteAccessibility,
    selectAsCanonical,
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
        accessibilityStandard={accessibilityStandard}
        accessibilityAdditionalStandard={accessibilityAdditionalStandard}
        accessibilityException={accessibilityException}
        accessibilityReportUrl={accessibilityReportUrl}
        onUpdateIsbn={updateIsbn}
        onUpdateType={updateType}
        onClose={close}
        onDone={create}
        onUpdateDimensions={updateDimensions}
        onUpdateAccessibilityStandard={updateAccessibilityStandard}
        onUpdateAccessibilityAdditionalStandard={updateAccessibilityAdditionalStandard}
        onUpdateAccessibilityException={updateAccessibilityException}
        onUpdateAccessibilityReport={updateAccessibilityReport}
        onDeleteAccessibility={deleteAccessibility}
      >
        <EditPrice onUpdate={updatePrices} onClose={close} prices={publication.prices} />
        <EditLocations
          locations={publication.locations}
          onUpdate={updateLocations}
          onClose={close}
          onSelectAsCanonical={selectAsCanonical}
        />
      </EditPublication>
    </TableNewEntityFormWrapper>
  );
};

export default AddNewPublication;
