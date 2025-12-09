'use client';

import { useTranslation } from 'react-i18next';

import {
  ReferencesTable,
  useDeleteReference,
  useMoveReferences,
  useReferencesStateMachine,
} from '@/src/entities/reference';
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
  const { activeReference, edit } = useReferencesStateMachine();
  const { deleteReference } = useDeleteReference({ workId, queryToken });
  const { moveReferences } = useMoveReferences({ workId, queryToken });

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

    const referencesToUpdate = updatedData.find((reference, index) => work.references[index].id !== reference.id);

    if (!referencesToUpdate) return;

    await moveReferences({ referenceId: referencesToUpdate.id, newOrdinal: referencesToUpdate.orderNumber });
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
          onDragEnd={dragEnd}
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
