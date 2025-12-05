import { Fragment } from 'react';

import { DragAndDropWrapper, TableBody, TableFormWrapper, TableHeader, TableWrapper } from '@/src/shared/ui';

import type { ReferenceEntity } from '../../model/reference.types';
import { ReferenceTableRow } from './components/ReferenceTableRow';

type ReferencesTableProps = {
  activeReference: ReferenceEntity | null;
  references: ReferenceEntity[];
  form: Readonly<React.ReactNode>;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDragEnd?: (data: ReferenceEntity[]) => void;
};

const ReferencesTable = (props: ReferencesTableProps) => {
  const { activeReference, references, form, onDelete, onEdit, onDragEnd } = props;

  return (
    <DragAndDropWrapper items={references} onDragEnd={onDragEnd}>
      <TableWrapper>
        <TableHeader
          cells={['No.', 'Citation', 'DOI']}
          cellStyles={['min-w-[60px]', 'min-w-[120px]', 'min-w-[250px]']}
        />
        <TableBody>
          {references.map((reference) => (
            <Fragment key={reference.id}>
              {activeReference?.id === reference.id ? (
                <TableFormWrapper colSpan={3}>{form}</TableFormWrapper>
              ) : (
                <ReferenceTableRow reference={reference} onDelete={onDelete} onEdit={onEdit} />
              )}
            </Fragment>
          ))}
        </TableBody>
      </TableWrapper>
    </DragAndDropWrapper>
  );
};

export default ReferencesTable;
