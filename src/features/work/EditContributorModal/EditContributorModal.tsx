'use client';

import CloseIcon from '@mui/icons-material/Close';

import { CreateContributorForm } from '@/src/entities/contributor';
import type { ContributorForm } from '@/src/entities/contributor/model/contributor.validation';
import { IconButton, Modal, ModalWrapper, Typography } from '@/src/shared/ui';

type EditContributorModalProps = {
  isOpen: boolean;
  defaultValues?: ContributorForm;
  isNew?: boolean;
  onEdit: (data: ContributorForm) => void;
  onClose: () => void;
};

const EditContributorModal = ({
  isOpen,
  defaultValues,
  isNew = false,
  onEdit,
  onClose,
}: EditContributorModalProps) => {


  return (
    <Modal open={isOpen} onClose={onClose}>
      <ModalWrapper>
        <div className="flex justify-between">
          <Typography variant="h2" component="h3" className="text-[var(--color-typography)]">
            {isNew ? 'Create new contributor' : 'Edit contributor'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon className="color-[var(--color-typography)]" />
          </IconButton>
        </div>
        <CreateContributorForm onSubmit={onEdit} defaultValues={defaultValues} isNew={isNew} />
      </ModalWrapper>
    </Modal>
  );
};

export default EditContributorModal;
