import { Fragment } from 'react';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Chip, TableBody, TableCell, TableFormWrapper, TableHeader, TableRow, TableWrapper, TranslatedContent } from '@/src/shared/ui';

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

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  return (
    <TableWrapper>
      <TableHeader
        cells={['publication type', 'ISBN']}
        cellStyles={['min-w-[250px] pl-4 capitalize', 'min-w-[250px]']}
      />
      <TableBody>
        {publications.map(
          ({
            id,
            type,
            isbn,
            width,
            widthIn,
            height,
            heightIn,
            depth,
            depthIn,
            weight,
            weightOz,
            prices,
            locations,
          }) => (
            <Fragment key={id}>
              {activePublication?.id === id ? (
                <TableFormWrapper colSpan={3}>{form}</TableFormWrapper>
              ) : (
                <TableRow className="group">
                  <TableCell className="firstCell">
                    <div className="flex flex-col gap-1">
                      <div className="ml-1 flex items-center gap-1">
                        {<TranslatedContent content={type.toLowerCase().replace('_', ' ')} />}
                      </div>
                      <div className="flex items-center gap-2">
                        {[width, widthIn, height, heightIn, depth, depthIn].some((value) => value) && (
                          <Chip label="mm/in" size="small" className="lowercase" />
                        )}
                        {[weight, weightOz].some((value) => value) && (
                          <Chip label="g/oz" size="small" className="lowercase" />
                        )}
                        {prices.length > 0 && (
                          <Chip
                            label={`${prices.length} ` + (prices.length > 1 ? t('prices') : t('price'))}
                            size="small"
                            className="lowercase"
                          />
                        )}
                        {locations.length > 0 && (
                          <Chip
                            label={`${locations.length} ` + (locations.length > 1 ? t('locations') : t('location'))}
                            size="small"
                            className="lowercase"
                          />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="lastCell">
                    <div className="flex justify-between">
                      {isbn}{' '}
                      <RowButtonGroup className="ml-auto" onDelete={() => onDelete?.(id)} onEdit={() => onEdit?.(id)} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ),
        )}
      </TableBody>
    </TableWrapper>
  );
};

export default PublicationsTable;
