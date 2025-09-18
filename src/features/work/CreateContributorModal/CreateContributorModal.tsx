'use client';

import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';

import { CreateContributorForm } from '@/src/entities/contributor';
import { Button, IconButton, Modal, ModalWrapper, Typography } from '@/src/shared/ui';

const CreateContributorModal = () => {
  const [open, setOpen] = useState(false);

  const handleModalState = () => {
    setOpen((prev) => !prev);
  };

  return (
    <>
      <Button variant="text" className="px-5" onClick={handleModalState}>
        Create new
      </Button>
      <Modal open={open} onClose={handleModalState}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-[var(--color-typography)]">
              Create new contributor
            </Typography>
            <IconButton onClick={handleModalState}>
              <CloseIcon className="color-[var(--color-typography)]" />
            </IconButton>
          </div>
          <CreateContributorForm />
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default CreateContributorModal;
