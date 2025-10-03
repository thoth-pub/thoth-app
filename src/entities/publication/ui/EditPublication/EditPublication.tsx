import { PublicationType as PublicationTypeEnum } from '@/src/shared/constants';
import { TableFormsHeader, TableFormsWrapper, TableNewEntityFormWrapper } from '@/src/shared/ui';

import type { PublicationDimensionsForm, PublicationType } from '../../model/publication.types';
import { EditDimensions } from './components/EditDimensions';
import EditIsbn from './components/EditIsbn';
import EditPublicationType from './components/EditPublicationType';

type EditPublicationProps = {
  title: string;
  publicationType: PublicationType;
  showRecommendations: boolean;
  isbn: string;
  width: number;
  height: number;
  depth: number;
  weight: number;
  isDimensionFormHidden: boolean;
  onDone?: () => void;
  onClose?: () => void;
  onUpdateType?: (type: PublicationType) => void;
  onUpdateIsbn?: (isbn: string) => void;
  onUpdateDimensions?: (dimensions: PublicationDimensionsForm) => void;
};

const EditPublication = (props: EditPublicationProps) => {
  const {
    title,
    publicationType,
    isbn,
    width,
    height,
    depth,
    weight,
    showRecommendations,
    isDimensionFormHidden,
    onDone,
    onClose,
    onUpdateType,
    onUpdateIsbn,
    onUpdateDimensions,
  } = props;

  const isPhisical =
    publicationType === PublicationTypeEnum.enum.Hardback || publicationType === PublicationTypeEnum.enum.Paperback;
  const isDimensionsHidden = isDimensionFormHidden || !isPhisical;

  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title={title} onDone={onDone} onClose={onClose} />
        <EditPublicationType publicationType={publicationType} onSubmit={onUpdateType} />
        <EditIsbn recommended={showRecommendations} isbn={isbn} onSubmit={onUpdateIsbn} />
        {!isDimensionsHidden && (
          <EditDimensions
            recommended={showRecommendations}
            width={width}
            height={height}
            depth={depth}
            weight={weight}
            onSubmit={onUpdateDimensions}
          />
        )}
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditPublication;
