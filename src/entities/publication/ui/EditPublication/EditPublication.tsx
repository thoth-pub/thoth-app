import { TableFormsHeader, TableFormsWrapper, TableNewEntityFormWrapper } from '@/src/shared/ui';

type EditPublicationProps = {
  title: string;
  onDone?: () => void;
  onClose?: () => void;
};

const EditPublication = ({ title, onDone, onClose }: EditPublicationProps) => {
  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title={title} onDone={onDone} onClose={onClose} />
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditPublication;
