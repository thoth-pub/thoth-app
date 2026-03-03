'use client';

import { PublicationsList } from '@/src/entities/publication';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, TranslatedContent } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { AddNewPublication, EditPublication } from '../../publications';
import { useEditPublications } from './useEditPublications';

const EditPublications = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const {
    publications,
    activePublication,
    isNewPublication,
    isDimensionFormHidden,
    uploadDisabled,
    editDisabled,
    addPublication,
    deletePublication,
    editPublication,
  } = useEditPublications(workId);

  return (
    <ContentSection title={<TranslatedContent content="publications" />}>
      <>
        <PublicationsList
          activePublication={activePublication}
          publications={publications}
          editDisabled={editDisabled}
          form={
            <EditPublication
              workId={workId}
              isUploadFileFormDisabled={uploadDisabled}
              isDimensionFormHidden={isDimensionFormHidden}
            />
          }
          onEdit={editPublication}
          onDelete={deletePublication}
        />
        {isNewPublication && (
          <AddNewPublication
            workId={workId}
            isUploadFileFormDisabled={uploadDisabled}
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
