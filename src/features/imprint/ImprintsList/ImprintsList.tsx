'use client';

import {
  EditImprint,
  ImprintId,
  useCreateImprint,
  useDeleteImprint,
  useGetPublisherImprints,
  useUpdateImprint,
} from '@/src/entities/imprint';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { appConfig, IDs, isDefaultId } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { Button, TranslatedContent } from '@/src/shared/ui';

const ImprintsList = () => {
  const { edit, activeFormId, close } = useFormStateMachine();
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher ? activePublisher.id : '';

  const { data } = useGetPublisherImprints(publisherId);
  const defaultImprintId = IDs.IMPRINT(appConfig.defaultId);
  const isEditingNewImprint = activeFormId && isDefaultId(activeFormId as string);
  const { createImprint } = useCreateImprint();
  const { updateImprint } = useUpdateImprint();
  const { deleteImprint } = useDeleteImprint();

  const addNewImprint = () => {
    edit(defaultImprintId);
  };

  const handleCreateNewImprint = async ({ imprintName }: { imprintName: string }) => {
    if (!activePublisher) return;

    await createImprint({ publisherId: activePublisher.id, imprintName });
    close();
  };

  const handleUpdateImprint = async ({ imprintName, imprintId }: { imprintName: string; imprintId: ImprintId }) => {
    await updateImprint({ data: { name: imprintName, id: imprintId }, publisherId });
    close();
  };

  const handleDeleteImprint = async (imprintId: ImprintId) => {
    if (!activePublisher) return;

    await deleteImprint({ imprintId, publisherId: activePublisher.id });
    close();
  };

  return (
    <>
      <ul>
        {data.map((imprint) => (
          <li key={imprint.id}>
            <EditImprint
              defaultValue={imprint.name}
              id={imprint.id}
              onUpdate={handleUpdateImprint}
              onDelete={handleDeleteImprint}
            />
          </li>
        ))}
      </ul>
      {isEditingNewImprint && (
        <EditImprint defaultValue={''} id={appConfig.defaultId} onUpdate={handleCreateNewImprint} />
      )}
      <Button className="mr-auto capitalize" onClick={addNewImprint} disabled={!!activeFormId}>
        <TranslatedContent content="actions.addNewImprint" />
      </Button>
    </>
  );
};

export default ImprintsList;
