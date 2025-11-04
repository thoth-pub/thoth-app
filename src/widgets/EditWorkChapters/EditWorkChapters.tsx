'use client';

import { DndContext, useSensor, PointerSensor, useSensors, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { appConfig, BaseEditSectionProps } from '@/src/shared';
import { Button, Checkbox, Table, TableBody, TableHeader, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { useEffect, useState } from 'react';
import { ChapterTableRow } from './components/TableRow';
import { useWorkChapters, useWorkChaptersStateMachine } from '@/src/entities/work';
import AddChapterModal from '@/src/features/work/AddChapterModal/AddChapterModal';
import { EditChapterModal, EditChaptersModal } from '@/src/features';
import useDeleteWork from '@/src/entities/work/api/hooks/useDeleteWork';

export const EditWorkChapters = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { chapters } = useWorkChapters({ workId });
  const { edit } = useWorkChaptersStateMachine();

  const [items, setItems] = useState(chapters);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isDragStarted, setIsDragStarted] = useState(false);
  const { deleteWork } = useDeleteWork({
    queryToken,
    redirect: false,
  });

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (chapters.length === 0 || chapters.length === items.length) return;

    setItems(chapters);
  }, [chapters]);

  const dragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // onReorderEnd?.(newItems);

        return newItems;
      });
      setIsDragStarted(false);
    }
  };

  const dragStart = () => {
    setIsDragStarted(true);
  };

  const handleSelectChapter = (id: string) => {
    setSelectedChapters((selectedChapters) => [...selectedChapters, id]);
  };

  const handleDeselectChapter = (id: string) => {
    setSelectedChapters((selectedChapters) => selectedChapters.filter((chapter) => chapter !== id));
  };

  const handleSelectAllChapters = () => {
    if (selectedChapters.length === items.length) {
      setSelectedChapters([]);
      return;
    }

    setSelectedChapters(items.map((chapter) => chapter.id));
  };

  const handleEditChapter = (id: string) => {
    const chapter = items.find((chapter) => chapter.id === id);

    if (!chapter) return;

    close();

    edit([chapter]);
  };

  const handleEditChapters = () => {
    close();

    edit(items.filter((chapter) => selectedChapters.includes(chapter.id)));
  };

  const handleClearSelection = () => {
    setSelectedChapters([]);
    close();
  };

  const handleCopyChapter = (id: string) => {
    const chapter = items.find((chapter) => chapter.id === id);

    if (!chapter) return;

    edit([{ ...chapter, id: appConfig.defaultId }]);
  };

  const handleDeleteChapter = (id: string) => {
    setItems((items) => items.filter((chapter) => chapter.id !== id));
    deleteWork(id);
  };

  return (
    <ContentSection
      title="Chapters"
      headerContent={
        <div className="flex items-center gap-2">
          <Button size="small" className="capitalize" onClick={handleClearSelection}>
            Clear
          </Button>
          <Button
            variant="contained"
            size="small"
            className="capitalize"
            disabled={selectedChapters.length < 2}
            onClick={handleEditChapters}
          >
            Edit multiple
          </Button>
        </div>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={dragStart} onDragEnd={dragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className={isDragStarted ? 'overflow-hidden' : 'overflow-auto'}>
            <Table className="border-separate">
              <TableHeader
                cells={[
                  'Title',
                  'Main Contributor',
                  <div className="flex items-center justify-between">
                    <Typography
                      variant="h2"
                      component="span"
                      className="max-w-[300px]"
                      sx={{
                        fontFamily: 'unset',
                        fontWeight: 'unset',
                        textTransform: 'unset',
                        fontSize: '1rem',
                        '@media (min-width: 1024px)': { fontSize: '1.375rem' },
                      }}
                    >
                      Pages Count
                    </Typography>
                    <Checkbox
                      size="small"
                      className="mr-2"
                      checked={selectedChapters.length > 0 && selectedChapters.length === items.length}
                      onChange={handleSelectAllChapters}
                    />
                  </div>,
                ]}
                cellStyles={['min-w-[210px]', 'min-w-[120px]']}
              />
              <TableBody>
                {items.map((chapter) => (
                  <ChapterTableRow
                    key={chapter.id}
                    chapter={chapter}
                    selected={selectedChapters.includes(chapter.id)}
                    onEdit={handleEditChapter}
                    onCopy={handleCopyChapter}
                    onSelect={handleSelectChapter}
                    onDeselect={handleDeselectChapter}
                    onDelete={handleDeleteChapter}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>
      <EditChapterModal queryToken={queryToken} />
      <EditChaptersModal queryToken={queryToken} />
      <AddChapterModal workId={workId} queryToken={queryToken} />
    </ContentSection>
  );
};
