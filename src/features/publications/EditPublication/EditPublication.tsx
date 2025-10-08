'use client';

import { EditLocations } from '@/src/entities/locations';
import { EditPrice } from '@/src/entities/price';
import { EditPublication as EditPublicationForm } from '@/src/entities/publication';
import type { BaseRecommendedSectionProps } from '@/src/shared';

import { useEditPublication } from './useEditPublication';

type EditPublicationProps = BaseRecommendedSectionProps & {
  isDimensionFormHidden: boolean;
};

const EditPublication = (props: EditPublicationProps) => {
  const { workId, queryToken, recommended = false, isDimensionFormHidden = false } = props;

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
      showRecommendations={recommended}
      isDimensionFormHidden={isDimensionFormHidden}
      publicationType={activePublication.type}
      isbn={activePublication.isbn}
      width={activePublication.width}
      height={activePublication.height}
      depth={activePublication.depth}
      weight={activePublication.weight}
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
