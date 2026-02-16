'use client';

import {
  ImprintId,
  useCreateImprint,
  useDeleteImprint,
  useGetPublisherImprints,
  useUpdateImprint,
} from '@/src/entities/imprint';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig, IDs, isDefaultId } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

export const useImprintsList = () => {
  const { edit, activeFormId, close } = useFormStateMachine();
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher ? activePublisher.id : '';

  const { data } = useGetPublisherImprints(publisherId);
  const defaultImprintId = IDs.IMPRINT(appConfig.defaultId);
  const isEditingNewImprint = activeFormId && isDefaultId(activeFormId as string);
  const { createImprint: createImprintMutation } = useCreateImprint();
  const { updateImprint: updateImprintMutation } = useUpdateImprint();
  const { deleteImprint: deleteImprintMutation } = useDeleteImprint();

  const addNewImprint = () => {
    edit(defaultImprintId);
  };

  const createImprint = async ({ imprintName }: { imprintName: string }) => {
    if (!activePublisher) return;

    await createImprintMutation({ publisherId: activePublisher.id, imprintName });
    close();
  };

  const updateImprint = async ({ imprintName, imprintId }: { imprintName: string; imprintId: ImprintId }) => {
    await updateImprintMutation({ data: { name: imprintName, id: imprintId }, publisherId });
    close();
  };

  const deleteImprint = async (imprintId: ImprintId) => {
    if (!activePublisher) return;

    await deleteImprintMutation({ imprintId, publisherId: activePublisher.id });
    close();
  };

  return {
    createImprint,
    updateImprint,
    deleteImprint,
    addNewImprint,
    isEditingNewImprint,
    data,
    isAddNewButtonDisabled: !!activeFormId,
  };
};
