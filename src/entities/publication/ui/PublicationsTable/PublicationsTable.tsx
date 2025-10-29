import { Fragment } from 'react';

import { Chip, Table, TableBody, TableCell, TableFormWrapper, TableHeader, TableRow } from '@/src/shared/ui';

import type { PublicationEntity } from '../../model/publication.types';
import { RowButtonGroup } from './components/RowButtonGroup';

type PublicationsTableProps = {
  activePublication: PublicationEntity | null;
  publications: PublicationEntity[];
  form: Readonly<React.ReactNode>;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const PublicationsTable = (props: PublicationsTableProps) => {
  const { activePublication, publications, form, onDelete, onEdit } = props;

  return (
    <div className="overflow-auto">
      <Table className="border-separate">
        <TableHeader cells={['Publication Type', 'ISBN']} cellStyles={['min-w-[250px]', 'min-w-[250px]']} />
        <TableBody>
          {publications.map(
            ({ id, type, isbn, width, widthIn, height, heightIn, depth, depthIn, weight, weightOz, prices }) => (
              <Fragment key={id}>
                {activePublication?.id === id ? (
                  <TableFormWrapper colSpan={3}>{form}</TableFormWrapper>
                ) : (
                  <TableRow className="group">
                    <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-7 capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">{type.toLowerCase()}</div>
                        <div className="flex items-center gap-2">
                          {[width, widthIn, height, heightIn, depth, depthIn].some((value) => value) && (
                            <Chip label="mm/in" size="small" className="lowercase" />
                          )}
                          {[weight, weightOz].some((value) => value) && (
                            <Chip label="g/oz" size="small" className="lowercase" />
                          )}
                          {prices.map(({ currencyCode, id }) => (
                            <Chip key={id} label={currencyCode} size="small" className="lowercase" />
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                      <div className="flex justify-between">
                        {isbn}{' '}
                        <RowButtonGroup
                          className="ml-auto"
                          onDelete={() => onDelete?.(id)}
                          onEdit={() => onEdit?.(id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PublicationsTable;
