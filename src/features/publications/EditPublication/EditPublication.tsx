'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication as EditPublicationForm } from '@/src/entities/publication';
import type { BaseEditSectionProps } from '@/src/shared';

import { useEditPublication } from './useEditPublication';

type EditPublicationProps = BaseEditSectionProps & {
  isDimensionFormHidden: boolean;
};

const EditPublication = (props: EditPublicationProps) => {
  const { workId, queryToken, isDimensionFormHidden = false } = props;

  const {
    activePublication,
    close,
    updateSizes,
    updateIsbn,
    updateType,
    updatePrices,
    updateLocations,
    deleteLocation,
    selectAsCanonical,
  } = useEditPublication({
    workId,
    queryToken,
  });

  if (!activePublication) return null;

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
      onUpdateIsbn={updateIsbn}
      onUpdateType={updateType}
      onDone={close}
      onClose={close}
      onUpdateDimensions={updateSizes}
    >
      <EditPrice prices={activePublication.prices} onUpdate={updatePrices} onClose={close} />
      <EditLocations
        locations={activePublication.locations}
        onUpdate={updateLocations}
        onClose={close}
        onDelete={deleteLocation}
        onSelectAsCanonical={selectAsCanonical}
      />
    </EditPublicationForm>
  );
};

export default EditPublication;
