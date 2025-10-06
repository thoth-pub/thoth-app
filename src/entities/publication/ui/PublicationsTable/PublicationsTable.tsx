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
    <Table>
      <TableHeader cells={['Publication Type', 'ISBN']} />
      <TableBody>
        {publications.map((publication) => (
          <Fragment key={publication.id}>
            {activePublication?.id === publication.id ? (
              <TableRow>
                <TableCell colSpan={3} className="rounded-2xl p-0">
                  {form}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow className="group">
                <TableCell className="rounded-tl-2xl rounded-bl-2xl pl-7 capitalize">
                  <div className="flex items-center gap-1">
                    {publication.type.toLowerCase()}{' '}
                    {showRecommendations && publication.isbn.length === 0 && <Indicator />}
                  </div>
                </TableCell>
                <TableCell className="rounded-tr-2xl rounded-br-2xl">
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
