'use client';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import { useRouter } from 'next/navigation';

import { SetId, SetWorkEntity, useBookSetWorks, useDeleteFromSet, useMoveSetRelation } from '@/src/entities/sets';
import { isDragAndDropDisabled, ROUTES } from '@/src/shared';
import {
  ButtonGroup,
  Chip,
  DeleteButton,
  DragAndDropListener,
  DragAndDropWrapper,
  DraggableComponent,
  IconButton,
  Typography,
} from '@/src/shared/ui';

import { AddBookModal } from './AddBookModal';

export const SetBooksList = ({ setId }: { setId: SetId }) => {
  const router = useRouter();

  const { bookSetWorks } = useBookSetWorks(setId);
  const { deleteFromSet } = useDeleteFromSet(setId);
  const { moveSetRelation } = useMoveSetRelation(setId);

  const handleDragEnd = (data: SetWorkEntity[]) => {
    const updatedBooks = data.map((book, index) => ({
      ...book,
      orderNumber: index + 1,
    }));

    const firstUpdatedBook = updatedBooks.find((book, index) => book.id !== bookSetWorks[index].id);

    if (!firstUpdatedBook) return;

    moveSetRelation({
      relationId: firstUpdatedBook.id,
      newOrdinal: firstUpdatedBook.orderNumber,
    });
  };

  const navigateToWork = (id: string) => {
    router.push(ROUTES.WORK_PAGE(id));
  };

  return (
    <div className="flex flex-col gap-[var(--default-gap)]">
      <Typography fontWeight="bold">Titles</Typography>
      <DragAndDropWrapper items={bookSetWorks} onDragEnd={handleDragEnd}>
        {() => (
          <ul className="group flex w-full flex-col gap-[var(--default-gap)]">
            {bookSetWorks.map(({ id, ordinal, workId, titles }) => (
              <DraggableComponent key={id} id={id}>
                {({ attributes, listeners, style, ref }) => (
                  <Typography
                    component="li"
                    className="flex items-center justify-between gap-2"
                    ref={ref}
                    style={style}
                    {...attributes}
                  >
                    <span className="flex items-center gap-4">
                      <DragAndDropListener
                        isDisabled={isDragAndDropDisabled(bookSetWorks.length)}
                        listeners={listeners}
                      />
                      <Chip label={ordinal.toString()} /> {titles[0].fullTitle}
                    </span>
                    <ButtonGroup>
                      <IconButton onClick={() => navigateToWork(workId)}>
                        <ArrowOutwardIcon />
                      </IconButton>
                      <DeleteButton className="ml-auto" onClick={() => deleteFromSet(id)} />
                    </ButtonGroup>
                  </Typography>
                )}
              </DraggableComponent>
            ))}
          </ul>
        )}
      </DragAndDropWrapper>
      <AddBookModal setId={setId} totalBooks={bookSetWorks.length} />
    </div>
  );
};
