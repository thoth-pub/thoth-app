'use client';

import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';

import { type ContributorEntity, CreateContributorForm, useCreateContributor } from '@/src/entities/contributor';
import type { ContributorForm } from '@/src/entities/contributor/model/contributor.validation';
import { config, NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { Button, IconButton, Modal, ModalWrapper, Typography } from '@/src/shared/ui';

type CreateContributorModalProps = {
  queryToken: QueryToken;
  onCreate: (data: ContributorEntity) => void;
};

const { CONTRIBUTOR_CREATION_SUCCESS, CONTRIBUTOR_CREATION_FAILED } = NOTIFICATIONS;

const CreateContributorModal = ({ queryToken, onCreate }: CreateContributorModalProps) => {
  const [open, setOpen] = useState(false);

  const { sendSuccessNotification, sendErrorNotification } = useNotifications();
  const { createContributor, toEntity } = useCreateContributor({
    queryToken,
    onCompleted: (data) => {
      const contributor = toEntity(data.createContributor);
      onCreate(contributor);
      sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);
      handleModalState();
    },
    onError: () => sendErrorNotification(CONTRIBUTOR_CREATION_FAILED),
  });

  const handleModalState = () => {
    setOpen((prev) => !prev);
  };

  const handleCreate = ({ firstName, lastName, orcid, websiteUrl }: ContributorForm) => {
    const createContributorData = {
      firstName: firstName ?? null,
      lastName,
      fullName: firstName ? firstName + ' ' + lastName : lastName,
      orcid: config.validations.orcidPrefix + orcid,
      website: websiteUrl ?? null,
    };

    createContributor({ variables: { data: createContributorData } });
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
          <CreateContributorForm onSubmit={handleCreate} />
        </ModalWrapper>
      </Modal>
    </>
  );
};

export default CreateContributorModal;
