'use client';

import DeselectIcon from '@mui/icons-material/Deselect';
import { useEffect, useState } from 'react';

import {
  useCreateWorkChapter,
  useDeleteChapter,
  useWorkChapters,
  useWorkChaptersStateMachine,
  useWorkMoveRelation,
} from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { EditChapterModal, EditChaptersModal } from '@/src/features';
import AddChapterModal from '@/src/features/work/AddChapterModal/AddChapterModal';
import { appConfig, BaseEditSectionProps } from '@/src/shared';
import {
  Checkbox,
  DeleteButton,
  DragAndDropWrapper,
  EditButton,
  IconButton,
  TableBody,
  TableHeader,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { ChapterTableRow } from './components/ChapterTableRow';

const NEW_CHAPTER_PREFIX = 'New Copy of ';

export const EditWorkChapters = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { chapters } = useWorkChapters({ workId });
  const { moveWorkRelation } = useWorkMoveRelation();
  const { createChapter } = useCreateWorkChapter({
    onCompleted: (chapter) => {
      edit([chapter]);
    },
  });
  const { edit } = useWorkChaptersStateMachine();

  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  const { deleteChapter, deleteChapters } = useDeleteChapter();

  useEffect(() => {
    if (chapters.length > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedChapters([]);
  }, [chapters]);

  const isMultipleChapters = chapters.length >= 2;
  const isMultipleChaptersSelected = selectedChapters.length > 1;

  const selectedChaptersTitle = `${selectedChapters.length} of ${chapters.length}`;

  const dragEnd = (data: WorkEntity[]) => {
    const reorderedChapters = data.map((chapter, index) => ({ ...chapter, ordinal: index + 1 }));

    const firstChangedChapter = reorderedChapters.find((chapter, index) => chapter.id !== chapters[index].id);

    if (!firstChangedChapter || !firstChangedChapter.relationId) return;

    moveWorkRelation({ workRelationId: firstChangedChapter.relationId, newOrdinal: firstChangedChapter.ordinal });
  };

  const handleSelectChapter = (id: string) => {
    setSelectedChapters((selectedChapters) => [...selectedChapters, id]);
  };

  const handleDeselectChapter = (id: string) => {
    setSelectedChapters((selectedChapters) => selectedChapters.filter((chapter) => chapter !== id));
  };

  const handleSelectAllChapters = () => {
    if (selectedChapters.length === chapters.length) {
      setSelectedChapters([]);
      return;
    }

    setSelectedChapters(chapters.map((chapter) => chapter.id));
  };

  const handleEditChapter = (id: string) => {
    const chapter = chapters.find((chapter) => chapter.id === id);

    if (!chapter) return;

    edit([chapter]);
  };

  const handleEditChapters = () => {
    edit(chapters.filter((chapter) => selectedChapters.includes(chapter.id)));
  };

  const handleClearSelection = () => {
    setSelectedChapters([]);
    close();
  };

  const handleCopyChapter = (id: string) => {
    const chapter = chapters.find((chapter) => chapter.id === id);

    if (!chapter) return;

    const newChapter = { ...chapter, id: appConfig.defaultId, title: NEW_CHAPTER_PREFIX + chapter.title, doi: '' };

    createChapter({ chapter: newChapter, relatedWorkId: workId, ordinal: chapters.length + 1 });
  };

  const handleDeleteChapter = async (id: string) => {
    await deleteChapter(id);
  };

  const handleBulkDelete = async () => {
    const selected = [...selectedChapters];

    await deleteChapters(selected);
  };

  const handleCloseMultipleChaptersEdit = () => {
    setSelectedChapters([]);
    close();
  };

  const handleDoneMultipleChaptersEdit = () => {
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
      <DragAndDropWrapper items={chapters} onDragEnd={dragEnd}>
        {(isDragStarted) => (
          <TableWrapper isOverflowHidden={isDragStarted}>
            <TableHeader
              cells={[
                'Title',
                'Contributors',
                <div key="page-range" className="flex items-center justify-between">
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
                    Page Range
                  </Typography>
                  {isMultipleChapters && (
                    <Checkbox
                      size="small"
                      className="mr-2"
                      checked={selectedChapters.length > 0 && selectedChapters.length === chapters.length}
                      onChange={handleSelectAllChapters}
                    />
                  )}
                </div>,
              ]}
              cellStyles={['min-w-[210px]', 'min-w-[120px]']}
            />
            <TableBody>
              {chapters.map((chapter) => (
                <ChapterTableRow
                  key={chapter.id}
                  chapter={chapter}
                  selected={selectedChapters.includes(chapter.id)}
                  totalChaptersCount={chapters.length}
                  onEdit={handleEditChapter}
                  onCopy={handleCopyChapter}
                  onSelect={handleSelectChapter}
                  onDeselect={handleDeselectChapter}
                  onDelete={handleDeleteChapter}
                  isButtonsDisabled={isMultipleChaptersSelected}
                />
              ))}
            </TableBody>
          </TableWrapper>
        )}
      </DragAndDropWrapper>
      <EditChapterModal />
      <EditChaptersModal
        workId={workId}
        title={`Editing ${selectedChaptersTitle} Chapters`}
        onClose={handleCloseMultipleChaptersEdit}
        onDone={handleDoneMultipleChaptersEdit}
      />
      <AddChapterModal workId={workId} />
    </ContentSection>
  );
};
