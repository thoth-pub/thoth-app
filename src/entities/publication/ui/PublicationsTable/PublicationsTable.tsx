import { Fragment } from 'react';

import { Indicator, Table, TableBody, TableCell, TableHeader, TableRow } from '@/src/shared/ui';

import type { PublicationEntity } from '../../model/publication.types';
import { RowButtonGroup } from './components/RowButtonGroup';

type PublicationsTableProps = {
  activePublication: PublicationEntity | null;
  showRecommendations: boolean;
  publications: PublicationEntity[];
  form: Readonly<React.ReactNode>;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const PublicationsTable = (props: PublicationsTableProps) => {
  const { activePublication, publications, form, showRecommendations, onDelete, onEdit } = props;

  return (
    <Table className="border-separate">
      <TableHeader cells={['Publication Type', 'ISBN']} />
      <TableBody>
        {publications.map((publication) => (
          <Fragment key={publication.id}>
            {activePublication?.id === publication.id ? (
              <TableRow>
                <TableCell colSpan={3} className="rounded-2xl border-1 border-[var(--color-form-border)] p-0">
                  {form}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow className="group">
                <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-7 capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
                  <div className="flex items-center gap-1">
                    {publication.type.toLowerCase()}{' '}
                    {showRecommendations && publication.isbn.length === 0 && <Indicator />}
                  </div>
                </TableCell>
                <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                  <div className="flex justify-between">
                    {publication.isbn}{' '}
                    <RowButtonGroup
                      className="ml-auto"
                      onDelete={() => onDelete?.(publication.id)}
                      onEdit={() => onEdit?.(publication.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
};

export default PublicationsTable;
