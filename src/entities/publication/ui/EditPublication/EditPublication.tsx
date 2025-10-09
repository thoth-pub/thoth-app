import { isDimensionsAvailable } from '@/src/shared';
import { TableFormsHeader, TableFormsWrapper, TableNewEntityFormWrapper } from '@/src/shared/ui';

import type { PublicationDimensionsForm, PublicationType } from '../../model/publication.types';
import { EditDimensions } from './components/EditDimensions';
import EditIsbn from './components/EditIsbn';
import EditPublicationType from './components/EditPublicationType';

type EditPublicationProps = {
  publicationType: PublicationType;
  showRecommendations: boolean;
  isbn: string;
  width: number;
  widthIn: number;
  height: number;
  heightIn: number;
  depth: number;
  depthIn: number;
  weight: number;
  weightOz: number;
  isDimensionFormHidden: boolean;
  children?: Readonly<React.ReactNode>;
  onDone?: () => void;
  onClose?: () => void;
  onUpdateType?: (type: PublicationType) => void;
  onUpdateIsbn?: (isbn: string) => void;
  onUpdateDimensions?: (dimensions: PublicationDimensionsForm) => void;
};
// TODO: accessibility form
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
    showRecommendations,
    isDimensionFormHidden,
    children,
    onDone,
    onClose,
    onUpdateType,
    onUpdateIsbn,
    onUpdateDimensions,
  } = props;

  const isDimensionsHidden = isDimensionFormHidden || !isDimensionsAvailable(publicationType);

  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title={publicationType} onDone={onDone} onClose={onClose} />
        <EditPublicationType publicationType={publicationType} onSubmit={onUpdateType} />
        <EditIsbn recommended={showRecommendations} isbn={isbn} onSubmit={onUpdateIsbn} />
        {!isDimensionsHidden && (
          <EditDimensions
            recommended={showRecommendations}
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
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditPublication;
