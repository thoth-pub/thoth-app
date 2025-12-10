'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication } from '@/src/entities/publication';
import { BaseRecommendedSectionProps } from '@/src/shared';

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
    selectAsCanonical,
  } = useAddNewPublication({
    workId,
  });

  if (!publication) return null;

  const { type, isbn, width, height, depth, weight, widthIn, heightIn, depthIn, weightOz } = publication;

  return (
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
      onUpdateIsbn={updateIsbn}
      onUpdateType={updateType}
      onClose={close}
      onDone={create}
      onUpdateDimensions={updateDimensions}
    >
      <EditPrice onUpdate={updatePrices} onClose={close} prices={publication.prices} />
      <EditLocations
        locations={publication.locations}
        onUpdate={updateLocations}
        onClose={close}
        onSelectAsCanonical={selectAsCanonical}
      />
    </EditPublication>
  );
};

export default AddNewPublication;
