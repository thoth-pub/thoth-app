import LinkIcon from '@mui/icons-material/Link';
import RateReviewIcon from '@mui/icons-material/RateReview';

import { CardListItem, DeleteButton, DoiPreview, LinkTooltip, MarkdownRenderer, RorLogo, Typography } from '@/src/shared/ui';
import { convertRorIdToText } from '@/src/shared/utils';

import { BookReviewEntity } from '../../../model/book-review.types';

type BookReviewCardListItemProps = {
  bookReview: BookReviewEntity;
  draggable?: boolean;
  editing: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const BookReviewCardListItem = (props: BookReviewCardListItemProps) => {
  const { bookReview, draggable, editing, form, editDisabled = false, deleteLoading = false, onDelete, onEdit } = props;

  const { id, title, authorName, reviewerInstitutionRor, url, doi } = bookReview;

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit book review"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      {title.length > 0 && (
        <Typography className="cardItem normal-case">
          <RateReviewIcon fontSize="small" color="primary" />
          <MarkdownRenderer markdown={title} /> {authorName.length > 0 && `(${authorName})`}
          {doi.length > 0 && <DoiPreview doi={doi} />}
          {url.length > 0 && (
            <LinkTooltip link={url} linkText={url}>
              <LinkIcon fontSize="small" color="primary" />
            </LinkTooltip>
          )}
          {reviewerInstitutionRor && (
            <LinkTooltip link={reviewerInstitutionRor} linkText={convertRorIdToText(reviewerInstitutionRor)}>
              <RorLogo />
            </LinkTooltip>
          )}
        </Typography>
      )}
    </CardListItem>
  );
};
