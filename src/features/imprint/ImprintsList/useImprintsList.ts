'use client';

import {
  ImprintId,
  useCreateImprint,
  useDeleteImprint,
  useGetPublisherImprints,
  useUpdateImprint,
} from '@/src/entities/imprint';
import { useActivePublisherPermissions, usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared/config';
import { IDs } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

export const useImprintsList = () => {
  const { isImprintEditable } = useActivePublisherPermissions();
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
    isAddNewButtonDisabled: !!activeFormId || !isImprintEditable,
    isImprintEditable,
  };
};
