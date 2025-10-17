'use client';

import { useTranslation } from 'react-i18next';

import { ReferencesTable, useDeleteReference, useReferencesStateMachine } from '@/src/entities/reference';
import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import { useWork } from '@/src/entities/work';
import { isDefaultId } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import AddReference from '../../reference/AddReference/AddReference';
import EditReference from '../../reference/EditReference/EditReference';

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

const EditReferences = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { t } = useTranslation();
  const { work } = useWork(workId, queryToken);
  const { activeReference, close, edit } = useReferencesStateMachine();
  const { deleteReference } = useDeleteReference({ workId, queryToken });

  const isNewReference = activeReference && isDefaultId(activeReference.id);

  const editReference = (id: string) => {
    if (activeReference) close();

    const reference = work.references.find((reference) => reference.id === id);

    if (!reference) return;

    edit({ ...reference });
  };

  const addReference = () => {
    if (activeReference) close();

    edit({ ...defaultReference });
  };

  return (
    <ContentSection title="References">
      <>
        <ReferencesTable
          activeReference={activeReference}
          references={work.references}
          form={<EditReference workId={workId} queryToken={queryToken} />}
          onDelete={(id) => deleteReference(id)}
          onEdit={(id) => editReference(id)}
        />
        {isNewReference && <AddReference workId={workId} queryToken={queryToken} />}
        <AddButton className="px-7 capitalize" onAdd={addReference} disabled={isNewReference}>
          {t('add reference')}
        </AddButton>
      </>
    </ContentSection>
  );
};

export default EditReferences;
