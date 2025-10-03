'use client';

import { PublicationsTable, usePublicationsStateMachine } from '@/src/entities/publication';
import { useWork } from '@/src/entities/work';
import { appConfig, type BaseEditSectionProps, isDefaultId, PublicationType } from '@/src/shared';
import { AddButton, RecommendedSection } from '@/src/shared/ui';

import { AddNewPublication } from '../../publications';

const defaultPublication = {
  id: appConfig.defaultId,
  isbn: '',
  title: '',
  type: PublicationType.enum.Pdf,
  updatedAt: '',
  doi: '',
  publisherName: '',
  width: 0,
  height: 0,
  depth: 0,
  weight: 0,
};

const EditPublications = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;
  const { activePublication, close, edit } = usePublicationsStateMachine();

  const { work } = useWork(workId, queryToken);

  const isNewPublication = activePublication && isDefaultId(activePublication.id);
  const isEmpty = work.publications.length === 0;

  const addPublication = () => {
    if (activePublication) close();

    edit({ ...defaultPublication });
  };

  return (
    <RecommendedSection title="Publications" isEmpty={isEmpty} isValid={!isEmpty}>
      {({ showRecommendations }) => (
        <>
          <PublicationsTable />
          {isNewPublication && <AddNewPublication workId={workId} queryToken={queryToken} />}
          <AddButton className="pl-7" onAdd={addPublication} disabled={isNewPublication}>
            Add Publication
          </AddButton>
        </>
      )}
    </RecommendedSection>
  );
};

export default EditPublications;
