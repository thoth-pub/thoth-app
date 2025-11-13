'use client';

import { useTranslation } from 'react-i18next';

import { PublicationsTable, usePublicationsStateMachine } from '@/src/entities/publication';
import useDeletePublication from '@/src/entities/publication/api/hooks/useDeletePublication';
import { useWork } from '@/src/entities/work';
import { appConfig, type BaseEditSectionProps, isDefaultId, PublicationType, WorkTypes } from '@/src/shared';
import { AddButton } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { AddNewPublication, EditPublication } from '../../publications';

const defaultPublication = {
  id: appConfig.defaultId,
  isbn: '',
  title: '',
  type: PublicationType.enum.Pdf,
  updatedAt: '',
  doi: '',
  publisherName: '',
  width: 0,
  widthIn: 0,
  height: 0,
  heightIn: 0,
  depth: 0,
  depthIn: 0,
  weight: 0,
  weightOz: 0,
  prices: [],
  locations: [],
};

const EditPublications = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activePublication, close, edit } = usePublicationsStateMachine();
  const { t } = useTranslation();
  const { work } = useWork(workId, queryToken);
  const { deletePublication: deletePublicationMutation } = useDeletePublication({ workId, queryToken });

  const isNewPublication = activePublication ? isDefaultId(activePublication.id) : false;

  const isDimensionFormHidden = work.type === WorkTypes.enum.BookChapter;

  const addPublication = () => {
    if (activePublication) close();

    edit({ ...defaultPublication });
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
          form={
            <EditPublication workId={workId} queryToken={queryToken} isDimensionFormHidden={isDimensionFormHidden} />
          }
          onEdit={editPublication}
          onDelete={deletePublication}
        />
        {isNewPublication && (
          <AddNewPublication workId={workId} queryToken={queryToken} isDimensionFormHidden={isDimensionFormHidden} />
        )}
        <AddButton className="px-7 capitalize" onAdd={addPublication} disabled={isNewPublication}>
          {t('add publication')}
        </AddButton>
      </>
    </ContentSection>
  );
};

export default EditPublications;
