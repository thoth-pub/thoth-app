'use client';

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
  TableBody,
  TableHeader,
  TableWrapper,
  TranslatedContent,
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

  const handleCopyChapter = (id: string) => {
    const chapter = chapters.find((chapter) => chapter.id === id);

    if (!chapter) return;

    const newTitles = chapter.titles.map((title) => ({ ...title, id: appConfig.defaultId }));

    const newChapter = {
      ...chapter,
      id: appConfig.defaultId,
      titles: newTitles,
      doi: '',
    };

    if (newTitles.length > 0) {
      newChapter.titles[0] = {
        ...newTitles[0],
        canonical: true,
        title: `${NEW_CHAPTER_PREFIX} ${newTitles[0].title}`,
      };
    }

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
      title={<TranslatedContent content="chapters" />}
      headerContent={
        <div className="flex min-h-10 items-center gap-2 pr-5">
          {isMultipleChaptersSelected && (
            <>
              <Typography component="span" className="max-w-[300px]">
                {
                  <TranslatedContent
                    content="selectedChapters"
                    options={{ selectedChapters: selectedChapters.length, totalChapters: chapters.length }}
                  />
                }
              </Typography>
              <DeleteButton onClick={handleBulkDelete} className="p-1" />
              <EditButton onClick={handleEditChapters} className="p-1" />
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
                'title',
                'contributors',
                <div key="page-range" className="flex items-center justify-between capitalize">
                  <TranslatedContent content="page range" />
                  {isMultipleChapters && (
                    <Checkbox
                      size="small"
                      className="mr-1 xl:mr-0.5"
                      checked={selectedChapters.length > 0 && selectedChapters.length === chapters.length}
                      onChange={handleSelectAllChapters}
                    />
                  )}
                </div>,
              ]}
              cellStyles={['min-w-[250px] pl-4 capitalize', 'min-w-[210px] capitalize']}
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
