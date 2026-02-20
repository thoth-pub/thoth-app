import { UniqueIdentifier } from '@dnd-kit/core';

import { mergeStyles } from '@/src/shared/utils';

import DragAndDropWrapper, { type DragAndDropWrapperProps } from '../DragAndDropWrapper/DragAndDropWrapper';
import { CardsListBackdrop } from './components/CardsListBackdrop';

type CardsListProps<T extends { id: UniqueIdentifier }> = {
  draggable?: boolean;
  loading?: boolean;
  children: (draggable?: boolean, isDragStarted?: boolean) => Readonly<React.ReactNode>;
  backdropClassName?: string;
  listClassName?: string;
} & DragAndDropWrapperProps<T>;

const listStyles = 'flex flex-col gap-1 relative';

const CardsList = <T extends { id: UniqueIdentifier }>(props: CardsListProps<T>) => {
  const { children, draggable = false, items, loading = false, backdropClassName, listClassName, onDragEnd } = props;

  if (draggable) {
    return (
      <DragAndDropWrapper items={items} onDragEnd={onDragEnd}>
        {(isDragStarted) => (
          <ul className={mergeStyles(listStyles, listClassName)}>
            {children(draggable, isDragStarted)}
            <CardsListBackdrop loading={loading} className={backdropClassName} />
          </ul>
        )}
      </DragAndDropWrapper>
    );
  }

  return (
    <ul className={mergeStyles(listStyles, listClassName)}>
      {children()}
      <CardsListBackdrop loading={loading} className={backdropClassName} />
    </ul>
  );
};

export default CardsList;
