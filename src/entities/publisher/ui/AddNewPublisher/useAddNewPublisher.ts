'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useCreateImprint } from '@/src/entities/imprint';
import { useUser } from '@/src/entities/user';
import { ROUTES } from '@/src/shared/constants';

import useCreatePublisher from '../../api/hooks/useCreatePublisher';
import { NewPublisherForm } from '../../model/publisher.types';
import { newPublisherValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

export const useAddNewPublisher = () => {
  const router = useRouter();
  const { createPublisher, loading } = useCreatePublisher();
  const { createImprint, loading: loadingImprint } = useCreateImprint();
  const { refetch, loading: loadingUserInfo } = useUser();
  const { changeActivePublisher, setLinkedPublishers } = usePublisherStateMachine();
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(newPublisherValidationSchema),
  });

  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const createNewPublisher = async (data: NewPublisherForm) => {
    const { publisherName } = data;

    const publisherId = await createPublisher(publisherName);
    await createImprint({ publisherId, imprintName: publisherName });
    const { data: user } = await refetch();

    if (!user) return;

    const linkedPublishers = user.linkedPublishers.map((publisher) => ({
      ...publisher,
      id: publisher.publisherId,
      name: publisher.publisherName,
    }));

    setLinkedPublishers(linkedPublishers, user.isSuperuser);

    const newPublisher = linkedPublishers.find((publisher) => publisher.id === publisherId);

    if (newPublisher) {
      changeActivePublisher(newPublisher);
      router.push(ROUTES.PUBLISHER);
    }

    setIsOpen(false);
  };

  return {
    isOpen,
    control,
    submitDisabled: loading || loadingUserInfo || loadingImprint || !isValid,
    openModal,
    closeModal,
    createNewPublisher,
    handleSubmit,
  };
};
