import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Chip, TranslatedContent } from '@/src/shared/ui';

type BooksChipProps = {
  booksCount: number;
};

const BooksChip = (props: BooksChipProps) => {
  const { booksCount } = props;

  if (booksCount < 1) return null;

  const isMoreThanOne = booksCount > 1;

  return (
    <Chip
      className="capitalize"
      label={
        <>
          {booksCount}{' '}
          <TranslatedContent
            content={isMoreThanOne ? 'books' : 'book'}
            namespace={isMoreThanOne ? NAMESPACES.enum.navigation : NAMESPACES.enum.common}
          />
        </>
      }
    />
  );
};

export default BooksChip;
