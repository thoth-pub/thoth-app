'use client';

import { PublicationsTable, usePublicationsStateMachine } from '@/src/entities/publication';
import useDeletePublication from '@/src/entities/publication/api/hooks/useDeletePublication';
import { useWork } from '@/src/entities/work';
import { type BaseEditSectionProps, getDefaultPublication, isDefaultId, WorkTypes } from '@/src/shared';
import { AddButton, TranslatedContent } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { AddNewPublication, EditPublication } from '../../publications';

const EditPublications = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { activePublication, close, edit } = usePublicationsStateMachine();
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

  return (
    <ContentSection title={<TranslatedContent content="publications" />}>
      <>
        <PublicationsTable
          activePublication={activePublication}
          publications={work.publications}
          form={
            <EditPublication
              workId={workId}
              isFileFormHidden={isFileFormHidden}
              isDimensionFormHidden={isDimensionFormHidden}
            />
          }
          onEdit={editPublication}
          onDelete={deletePublication}
        />
        {isNewPublication && (
          <AddNewPublication
            workId={workId}
            isFileFormHidden={isFileFormHidden}
            isDimensionFormHidden={isDimensionFormHidden}
          />
        )}
        <AddButton className="px-4 capitalize" onAdd={addPublication} disabled={isNewPublication}>
          <TranslatedContent content="actions.addNewPublication" />
        </AddButton>
      </>
    </ContentSection>
  );
};

export default EditPublications;
