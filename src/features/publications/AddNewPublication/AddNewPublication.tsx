'use client';

import { EditPrice } from '@/src/entities/price';
import { EditPublication } from '@/src/entities/publication';
import { BaseRecommendedSectionProps } from '@/src/shared';

import { useAddNewPublication } from './useAddNewPublication';

type AddNewPublicationProps = BaseRecommendedSectionProps & {
  isDimensionFormHidden: boolean;
};

const AddNewPublication = (props: AddNewPublicationProps) => {
  const { workId, queryToken, recommended = false, isDimensionFormHidden = false } = props;

  const { publication, close, create, updateIsbn, updateType, updateDimensions, updatePrices } = useAddNewPublication({
    workId,
    queryToken,
  });

  if (!publication) return null;

  const { type, isbn, width, height, depth, weight } = publication;

  return (
    <EditPublication
      showRecommendations={recommended}
      publicationType={type}
      isDimensionFormHidden={isDimensionFormHidden}
      isbn={isbn}
      width={width}
      height={height}
      depth={depth}
      weight={weight}
      onUpdateIsbn={updateIsbn}
      onUpdateType={updateType}
      onClose={close}
      onDone={create}
      onUpdateDimensions={updateDimensions}
    >
      <EditPrice onUpdate={updatePrices} onClose={close} prices={publication.prices} />
    </EditPublication>
  );
};

export default AddNewPublication;
