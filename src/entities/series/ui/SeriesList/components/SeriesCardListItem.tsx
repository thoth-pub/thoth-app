import UpdateIcon from '@mui/icons-material/Update';

import BooksChip from '@/src/features/books/BooksChip/BooksChip';
import { convertUpdatedAtToFormattedDate } from '@/src/shared';
import { CardListItem, DeleteButton, LandingPagesGallery, TranslatedContent, Typography } from '@/src/shared/ui';

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

  const images = issues.map((issue) => issue.coverUrl).filter((coverUrl) => coverUrl.length > 0);

  const handleEdit = () => {
    if (!onEdit) return;

    onEdit({ id, name, type, issnPrint, issnDigital, description, updatedAt, imprintId, imprintName, url, issues });
  };

  return (
    <CardListItem
      id={series.id}
      draggable={false}
      editing={editing}
      form={form}
      editDisabled={disabledControls}
      onEdit={handleEdit}
      ariaLabel="Edit series"
      actions={<DeleteButton onClick={() => onDelete?.(id)} />}
    >
      <div className="cardWithImageWrapper">
        <LandingPagesGallery images={images} />
        <Typography variant="h2" className="cardItem normal-case">
          {name} <BooksChip booksCount={issues.length} />
        </Typography>
      </div>
      <Typography className="cardItem">
        {<TranslatedContent content={type.toLowerCase().replace('_', ' ')} />}
      </Typography>
      <Typography className="cardItem">{issnPrint && issnPrint.length > 0 ? issnPrint : issnDigital}</Typography>
      <Typography className="cardItem">
        <UpdateIcon fontSize="small" color="primary" />
        {convertUpdatedAtToFormattedDate(updatedAt)}
      </Typography>
    </CardListItem>
  );
};
