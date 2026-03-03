import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { CardListItem, Chip, DeleteButton, Icon, TranslatedContent, Typography } from '@/src/shared/ui';

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
      id={id}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit publication"
      actions={<DeleteButton onClick={() => onDelete?.(id)} />}
    >
      <Typography variant="h2" className="normal-case">
        {<TranslatedContent content={type.toLowerCase().replace('_', ' ')} />}
      </Typography>
      {isbn.length > 0 && (
        <Typography className="cardItem">
          <Icon color="primary" fontSize="small">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <path d="M8 7v10" />
              <path d="M12 7v10" />
              <path d="M17 7v10" />
            </svg>
          </Icon>
          {isbn}
        </Typography>
      )}
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
