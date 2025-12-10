'use client';

import { useTranslation } from 'react-i18next';

import { PublicationsTable, usePublicationsStateMachine } from '@/src/entities/publication';
import useDeletePublication from '@/src/entities/publication/api/hooks/useDeletePublication';
import { useWork } from '@/src/entities/work';
import { type BaseEditSectionProps, getDefaultPublication, isDefaultId, WorkTypes } from '@/src/shared';
import { AddButton } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { AddNewPublication, EditPublication } from '../../publications';

const EditPublications = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { activePublication, close, edit } = usePublicationsStateMachine();
  const { t } = useTranslation();
  const { work } = useWork(workId);
  const { deletePublication: deletePublicationMutation } = useDeletePublication({ workId });

  const isNewPublication = activePublication ? isDefaultId(activePublication.id) : false;

  const isDimensionFormHidden = work.type === WorkTypes.enum.BookChapter;

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
    <ContentSection title="Publications">
      <>
        <PublicationsTable
          activePublication={activePublication}
          publications={work.publications}
          form={<EditPublication workId={workId} isDimensionFormHidden={isDimensionFormHidden} />}
          onEdit={editPublication}
          onDelete={deletePublication}
        />
        {isNewPublication && <AddNewPublication workId={workId} isDimensionFormHidden={isDimensionFormHidden} />}
        <AddButton className="px-7 capitalize" onAdd={addPublication} disabled={isNewPublication}>
          {t('add publication')}
        </AddButton>
      </>
    </ContentSection>
  );
};

export default EditPublications;
