import DescriptionSharpIcon from '@mui/icons-material/DescriptionSharp';
import UpdateIcon from '@mui/icons-material/Update';

import { convertUpdatedAtToFormattedDate } from '@/src/shared';
import { ButtonGroup, CardListItem, DeleteButton, EditButton, TranslatedContent, Typography } from '@/src/shared/ui';

import { SeriesEntity } from '../../../model/series.types';

type SeriesCardListItemProps = {
  series: SeriesEntity;
  editing?: boolean;
  disabledControls?: boolean;
  form?: Readonly<React.ReactNode>;
  onEdit?: (series: SeriesEntity) => void;
  onDelete?: (id: string) => void;
};

export const SeriesCardListItem = (props: SeriesCardListItemProps) => {
  const { series, editing = false, disabledControls = false, form, onEdit, onDelete } = props;

  const { id, name, type, issnPrint, issnDigital, description, updatedAt, imprintId, imprintName, url, issues } =
    series;

  return (
    <CardListItem
      id={series.id}
      draggable={false}
      editing={editing}
      form={form}
      actions={
        <ButtonGroup>
          <EditButton
            disabled={disabledControls}
            onClick={() =>
              onEdit?.({
                id,
                name,
                type,
                issnPrint,
                issnDigital,
                description,
                updatedAt,
                imprintId,
                imprintName,
                url,
                issues,
              })
            }
          />
          <DeleteButton onClick={() => onDelete?.(series.id)} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="cardItem normal-case">
        {name}
      </Typography>
      <Typography className="cardItem">
        {<TranslatedContent content={type.toLowerCase().replace('_', ' ')} />}
      </Typography>
      {description.length > 0 && (
        <Typography className="cardItem">
          <DescriptionSharpIcon fontSize="small" color="primary" className="mb-auto" />
          {description}
        </Typography>
      )}
      <Typography className="cardItem">{issnPrint && issnPrint.length > 0 ? issnPrint : issnDigital}</Typography>
      <Typography className="cardItem">
        <UpdateIcon fontSize="small" color="primary" />
        {convertUpdatedAtToFormattedDate(updatedAt)}
      </Typography>
    </CardListItem>
  );
};
