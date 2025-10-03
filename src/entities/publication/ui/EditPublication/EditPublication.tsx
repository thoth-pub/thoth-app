import { TableFormsHeader, TableFormsWrapper, TableNewEntityFormWrapper } from '@/src/shared/ui';

import type { PublicationDimensionsForm, PublicationType } from '../../model/publication.types';
import { EditDimensions } from './components/EditDimensions';
import EditIsbn from './components/EditIsbn';
import EditPublicationType from './components/EditPublicationType';

type EditPublicationProps = {
  title: string;
  publicationType: PublicationType;
  isbn: string;
  width: number;
  height: number;
  depth: number;
  weight: number;
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
    onDone,
    onClose,
    onUpdateType,
    onUpdateIsbn,
    onUpdateDimensions,
  } = props;

  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title={title} onDone={onDone} onClose={onClose} />
        <EditPublicationType publicationType={publicationType} onSubmit={onUpdateType} />
        <EditIsbn isbn={isbn} onSubmit={onUpdateIsbn} />
        <EditDimensions width={width} height={height} depth={depth} weight={weight} onSubmit={onUpdateDimensions} />
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditPublication;
