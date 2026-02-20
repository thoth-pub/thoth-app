import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  ButtonGroup,
  CardListItem,
  Chip,
  DeleteButton,
  EditButton,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

import { PublicationEntity } from '../../../model/publication.types';

type PublicationCardListItemProps = {
  publication: PublicationEntity;
  editing?: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const PublicationCardListItem = (props: PublicationCardListItemProps) => {
  const { publication, editing, form, editDisabled = false, onDelete, onEdit } = props;

  const { id, isbn, type, width, widthIn, height, heightIn, depth, depthIn, weight, weightOz, prices, locations } =
    publication;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  return (
    <CardListItem
      key={id}
      id={id}
      editing={editing}
      form={form}
      actions={
        <ButtonGroup>
          <EditButton onClick={() => onEdit?.(id)} disabled={editDisabled} />
          <DeleteButton onClick={() => onDelete?.(id)} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="normal-case">
        {<TranslatedContent content={type.toLowerCase().replace('_', ' ')} />}
      </Typography>
      {isbn.length > 0 && <Typography>{isbn}</Typography>}
      <div className="flex items-center gap-2">
        {[width, widthIn, height, heightIn, depth, depthIn].some((value) => value) && (
          <Chip label="mm/in" size="small" className="lowercase" />
        )}
        {[weight, weightOz].some((value) => value) && <Chip label="g/oz" size="small" className="lowercase" />}
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
    </CardListItem>
  );
};
