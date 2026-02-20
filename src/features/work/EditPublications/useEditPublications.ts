import { usePublicationsStateMachine } from '@/src/entities/publication';
import useDeletePublication from '@/src/entities/publication/api/hooks/useDeletePublication';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { getDefaultPublication, isDefaultId, WorkTypes } from '@/src/shared';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

export const useEditPublications = (workId: WorkId) => {
  const { activePublication, close, edit } = usePublicationsStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { work } = useWork(workId);
  const { deletePublication: deletePublicationMutation } = useDeletePublication({ workId });

  const isNewPublication = activePublication ? isDefaultId(activePublication.id) : false;

  const isDimensionFormHidden = work.type === WorkTypes.enum.BookChapter;
  const isFileFormHidden = !work.doi || work.doi.length === 0;

  const addPublication = () => {
    if (activePublication) close();

    edit({ ...getDefaultPublication() });
  };

  const deletePublication = (id: string) => {
    if (activePublication) close();

    deletePublicationMutation(id);
  };

  const editPublication = (id: string) => {
    if (activePublication) close();

    const publication = work.publications.find((publication) => publication.id === id);

    if (!publication) return;

    edit({ ...publication });
  };

  return {
    publications: work.publications,
    activePublication,
    isNewPublication,
    isDimensionFormHidden,
    isFileFormHidden,
    editDisabled: !!activeFormId,
    addPublication,
    deletePublication,
    editPublication,
  };
};
