'use client';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import { useRouter } from 'next/navigation';

import { SetId, SetWorkEntity, useBookSetWorks, useDeleteFromSet, useMoveSetRelation } from '@/src/entities/sets';
import { ROUTES } from '@/src/shared/constants';
import {
  Backdrop,
  ButtonGroup,
  Chip,
  CircularProgress,
  DeleteButton,
  DragAndDropListener,
  DragAndDropWrapper,
  DraggableComponent,
  IconButton,
  Typography,
} from '@/src/shared/ui';
import { isDragAndDropDisabled } from '@/src/shared/utils';

import { AddBookModal } from './AddBookModal';

export const SetBooksList = ({ setId }: { setId: SetId }) => {
  const router = useRouter();

  const { bookSetWorks, isLoading, isFetching } = useBookSetWorks(setId);
  const { deleteFromSet } = useDeleteFromSet(setId);
  const { moveSetRelation } = useMoveSetRelation(setId);

  const loading = isLoading || isFetching;

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
    <div className="relative flex flex-col gap-(--default-gap)">
      <Typography fontWeight="bold">Titles</Typography>
      <DragAndDropWrapper items={bookSetWorks} onDragEnd={handleDragEnd}>
        {() => (
          <ul className="group flex w-full flex-col gap-(--default-gap)">
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
                        <EditSquareIcon />
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
      <Backdrop open={loading} className="absolute h-full w-full bg-white/50">
        <CircularProgress />
      </Backdrop>
      <AddBookModal setId={setId} totalBooks={bookSetWorks.length} />
    </div>
  );
};
