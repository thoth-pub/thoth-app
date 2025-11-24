'use client';

import DeselectIcon from '@mui/icons-material/Deselect';
import { DndContext, useSensor, PointerSensor, useSensors, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { appConfig, BaseEditSectionProps } from '@/src/shared';
import {
  Checkbox,
  DeleteButton,
  EditButton,
  IconButton,
  Table,
  TableBody,
  TableHeader,
  Typography,
} from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { useEffect, useState } from 'react';
import { ChapterTableRow } from './components/ChapterTableRow';
import {
  useCreateWork,
  useCreateWorkRelation,
  useDeleteChapter,
  useWorkChapters,
  useWorkChaptersStateMachine,
} from '@/src/entities/work';
import AddChapterModal from '@/src/features/work/AddChapterModal/AddChapterModal';
import { EditChapterModal, EditChaptersModal } from '@/src/features';
import { RelationType } from '@/gql/graphql';
import { useWorkContribution } from '@/src/entities/work/api/hooks/useWorkContribution';
import { WorkContribution } from '@/src/entities/work/model/work.types';
import { WorkDtoMapper } from '@/src/entities/work/model/work.mapper';
import { useCreateFunding } from '@/src/entities/funding';
import { useCreateSubject } from '@/src/entities/subject';

const NEW_CHAPTER_PREFIX = 'New Copy of ';

const mapper = new WorkDtoMapper();

export const EditWorkChapters = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { chapters, refetchChapters } = useWorkChapters({ workId });
  const { edit } = useWorkChaptersStateMachine();

  const [items, setItems] = useState(chapters);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isDragStarted, setIsDragStarted] = useState(false);
  const { createWorkRelation } = useCreateWorkRelation({
    queryToken,
    workId,
  });

  const { createContribution: createContributionMutation } = useWorkContribution({
    queryToken,
  });

  const { createFunding } = useCreateFunding({
    queryToken,
    workId,
  });

  const { createSubject } = useCreateSubject({
    queryToken,
    workId,
  });

  const createContribution = async (data: WorkContribution, workId: string) => {
    const dto = mapper.toDtoContribution(data);

    await createContributionMutation({
      variables: { data: { workId, ...dto } },
    });
  };

  const { createWork } = useCreateWork({
    queryToken,
    onCompleted: async (work) => {
      const existingChapter = items.find((item) => item.title === work.title.replace(`${NEW_CHAPTER_PREFIX}`, ''));

      existingChapter?.contributions.forEach(async ({ id, ...contribution }) => {
        await createContribution({ ...contribution, id: appConfig.defaultId }, work.id);
      });

      existingChapter?.fundings.forEach(async (funding) => {
        await createFunding(funding, work.id);
      });

      existingChapter?.subjects.forEach(async (subject) => {
        await createSubject(subject, work.id);
      });

      createWorkRelation({
        variables: {
          data: {
            relatorWorkId: work.id,
            relatedWorkId: workId,
            relationOrdinal: items.length + 1,
            relationType: RelationType.IsChildOf,
          },
        },
      });

      const isCopied = work.title.startsWith(NEW_CHAPTER_PREFIX);

      if (isCopied) {
        edit([work]);
      }
    },
  });
  const { deleteChapter, deleteChapters } = useDeleteChapter({
    queryToken,
    workId,
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const isMultipleChaptersSelected = selectedChapters.length > 1;

  const selectedChaptersTitle = `${selectedChapters.length} of ${items.length}`;

  useEffect(() => {
    if (chapters.length === 0) return;

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

    edit([chapter]);
  };

  const handleEditChapters = () => {
    edit(items.filter((chapter) => selectedChapters.includes(chapter.id)));
  };

  const handleClearSelection = () => {
    setSelectedChapters([]);
    close();
  };

  const handleCopyChapter = (id: string) => {
    const chapter = items.find((chapter) => chapter.id === id);

    if (!chapter) return;

    const newChapter = { ...chapter, id: appConfig.defaultId, title: NEW_CHAPTER_PREFIX + chapter.title, doi: '' };

    createWork(newChapter);
  };

  const handleDeleteChapter = async (id: string) => {
    setItems((items) => items.filter((chapter) => chapter.id !== id));
    await deleteChapter(id);
    refetchChapters();
  };

  const handleBulkDelete = async () => {
    const selected = [...selectedChapters];

    setItems((items) => items.filter((chapter) => !selected.includes(chapter.id)));

    await deleteChapters(selected);
    refetchChapters();
  };

  const handleCloseMultipleChaptersEdit = () => {
    setSelectedChapters([]);
    close();
  };

  const handleDoneMultipleChaptersEdit = () => {
    refetchChapters();
    handleCloseMultipleChaptersEdit();
  };

  return (
    <ContentSection
      title="Chapters"
      headerContent={
        <div className="flex min-h-10 items-center gap-2 pr-5">
          {isMultipleChaptersSelected && (
            <>
              <Typography
                component="span"
                className="max-w-[300px]"
              >{`${selectedChaptersTitle} chapters selected`}</Typography>
              <DeleteButton onClick={handleBulkDelete} />
              <EditButton onClick={handleEditChapters} />
              <IconButton onClick={handleClearSelection}>
                <DeselectIcon fontSize="large" />
              </IconButton>
            </>
          )}
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
                  'Contributors',
                  'Page Range',
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
                        '@media (min-width: 1280px)': { fontSize: '1.375rem' },
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
                    isButtonsDisabled={isMultipleChaptersSelected}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>
      <EditChapterModal queryToken={queryToken} onDone={refetchChapters} />
      <EditChaptersModal
        workId={workId}
        queryToken={queryToken}
        title={`Editing ${selectedChaptersTitle} Chapters`}
        onClose={handleCloseMultipleChaptersEdit}
        onDone={handleDoneMultipleChaptersEdit}
      />
      <AddChapterModal workId={workId} queryToken={queryToken} />
    </ContentSection>
  );
};
