import { Chip, TranslatedContent } from '@/src/shared/ui';

type BooksChipProps = {
  booksCount: number;
  itemPlaceholder?: string;
  itemsPlaceholder?: string;
};

const BooksChip = (props: BooksChipProps) => {
  const { booksCount, itemPlaceholder = 'book', itemsPlaceholder = 'books' } = props;

  if (booksCount < 1) return null;

  const isMoreThanOne = booksCount > 1;

  return (
    <Chip
      className="capitalize"
      label={
        <>
          {booksCount} <TranslatedContent content={isMoreThanOne ? itemsPlaceholder : itemPlaceholder} />
        </>
      }
    />
  );
};

export default BooksChip;
