import { Fragment } from 'react';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/src/shared/ui';

import type { ReferenceEntity } from '../../model/reference.types';
import { RowButtonGroup } from './components/RowButtonGroup';

type ReferencesTableProps = {
  activeReference: ReferenceEntity | null;
  references: ReferenceEntity[];
  form: Readonly<React.ReactNode>;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const ReferencesTable = (props: ReferencesTableProps) => {
  const { activeReference, references, form, onDelete, onEdit } = props;

  return (
    <div className="overflow-auto">
      <Table className="border-separate">
        <TableHeader
          cells={['Citation', 'DOI', 'Ordinal']}
          cellStyles={['min-w-[120px]', 'min-w-[250px]', 'min-w-[120px]']}
        />
        <TableBody>
          {references.map(({ id, doi, unstructuredCitation, orderNumber }) => (
            <Fragment key={id}>
              {activeReference?.id === id ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="rounded-2xl border-1 border-[var(--color-form-border)] bg-[var(--color-form-background)]"
                  >
                    {form}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow className="group">
                  <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-7 capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
                    <div className="flex items-center gap-1">{unstructuredCitation}</div>
                  </TableCell>
                  <TableCell className="border-t-1 border-b-1 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                    {doi}
                  </TableCell>
                  <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                    <div className="flex justify-between">
                      {orderNumber}
                      <RowButtonGroup className="ml-auto" onDelete={() => onDelete?.(id)} onEdit={() => onEdit?.(id)} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReferencesTable;
