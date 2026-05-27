import type { ReactNode } from 'react';

import SubmitButton from '../../forms/SubmitButton/SubmitButton';
import CloseButton from '../CloseButton/CloseButton';
import Modal from '../Modal/Modal';
import ModalWrapper from '../ModalWrapper/ModalWrapper';
import Typography from '../Typography/Typography';

type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) => {
  return (
    <Modal open={open}>
      <ModalWrapper onClickAway={onCancel}>
        <div className="flex justify-between">
          <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) capitalize">
            {title}
          </Typography>
          <div className="flex gap-2">
            <SubmitButton onClick={onConfirm} />
            <CloseButton onClose={onCancel} />
          </div>
        </div>
        <Typography className="pl-4">{description}</Typography>
      </ModalWrapper>
    </Modal>
  );
};

export default ConfirmDialog;
