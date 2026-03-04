import { usePublicationsStateMachine } from '@/src/entities/publication';
import useDeletePublication from '@/src/entities/publication/api/hooks/useDeletePublication';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { WorkTypes } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { getDefaultPublication, isDefaultId } from '@/src/shared/utils';

export const useEditPublications = (workId: WorkId) => {
  const { activeEntity: activePublication, finishEditing, edit } = usePublicationsStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { work } = useWork(workId);
  const { deletePublication: deletePublicationMutation } = useDeletePublication({ workId });

  const isNewPublication = activePublication ? isDefaultId(activePublication.id) : false;

  const isDimensionFormHidden = work.type === WorkTypes.enum.BookChapter;
  const uploadDisabled = !work.doi || work.doi.length === 0 || !work.landingPage || work.landingPage.length === 0;

  const addPublication = () => {
    if (activePublication) finishEditing();

    edit({ ...getDefaultPublication() });
  };

  const deletePublication = (id: string) => {
    if (activePublication) finishEditing();

    deletePublicationMutation(id);
  };

  const editPublication = (id: string) => {
    if (activePublication) finishEditing();

    const publication = work.publications.find((publication) => publication.id === id);

    if (!publication) return;

    edit({ ...publication });
  };

  return {
    publications: work.publications,
    activePublication,
    isNewPublication,
    isDimensionFormHidden,
    uploadDisabled,
    editDisabled: !!activeFormId,
    addPublication,
    deletePublication,
    editPublication,
  };
};
