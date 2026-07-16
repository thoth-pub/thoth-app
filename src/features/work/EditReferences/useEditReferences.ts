'use client';

import {
  useDeleteReference,
  useMoveReferences,
  useReferenceStateMachine,
  useUpdateReference,
} from '@/src/entities/reference';
import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

const defaultReference: ReferenceEntity = {
  id: appConfig.defaultId,
  doi: '',
  journalTitle: '',
  articleTitle: '',
  seriesTitle: '',
  volumeTitle: '',
  url: '',
  orderNumber: 0,
  unstructuredCitation: '',
};

export const useEditReferences = (workId: WorkId) => {
  const { work, loading, fetching } = useWork(workId);
  const { activeEntity: activeReference, edit } = useReferenceStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteReference: deleteReferenceMutation, loading: deleteLoading } = useDeleteReference({ workId });
  const { updateReference } = useUpdateReference({ workId });
  const { moveReferences } = useMoveReferences({ workId });

  const isNewReference = activeReference ? isDefaultId(activeReference.id) : false;

  const editReference = (id: string) => {
    const reference = work.references.find((reference) => reference.id === id);

    if (!reference) return;

    edit({ ...reference });
  };

  const addReference = () => {
    edit({ ...defaultReference });
  };

  const dragEnd = async (data: ReferenceEntity[]) => {
    const updatedData = data.map((reference, index) => ({ ...reference, orderNumber: index + 1 }));

    const referencesToUpdate = updatedData.find((reference, index) => work.references[index]?.id !== reference.id);

    if (!referencesToUpdate) return;

    await moveReferences({ referenceId: referencesToUpdate.id, newOrdinal: referencesToUpdate.orderNumber });
  };

  const deleteReference = async (id: string) => {
    try {
      await deleteReferenceMutation(id);

      const remainingReferences = work.references.filter((reference) => reference.id !== id);

      // Ordinals are unique per work, so only the shifted references are updated, one
      // at a time in ascending order — each update moves into the slot freed by the
      // deletion or by the previous update.
      for (const [index, reference] of remainingReferences.entries()) {
        const orderNumber = index + 1;

        if (reference.orderNumber === orderNumber) continue;

        await updateReference({ ...reference, orderNumber });
      }
    } catch {
      // The mutation hooks surface the error notification; remaining renumbering is
      // skipped, which at worst leaves a gap in the ordinals.
    }
  };

  return {
    references: work.references,
    activeReference,
    isNewReference,
    editDisabled: !!activeFormId,
    loading: loading || fetching,
    deleteLoading,
    editReference,
    addReference,
    dragEnd,
    deleteReference,
  };
};
