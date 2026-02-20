'use client';

import { EditChapterModal, EditChaptersModal } from '@/src/features';
import AddChapterModal from '@/src/features/work/AddChapterModal/AddChapterModal';
import { BaseEditSectionProps } from '@/src/shared';
import { DeleteButton, EditButton, TranslatedContent, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { ChaptersList } from './components/ChaptersList';
import { useEditWorkChapters } from './useEditWorkChapters';

export const EditWorkChapters = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const {
    chapters,
    selectedChapters,
    isMultipleChaptersSelected,
    selectedChaptersTitle,
    controlsDisabled,
    loading,
    dragEnd,
    selectChapter,
    deselectChapter,
    editChapter,
    editChapters,
    copyChapter,
    deleteChapter,
    deleteChapters,
    closeMultipleChaptersEdit,
    doneMultipleChaptersEdit,
  } = useEditWorkChapters(workId);

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
              <EditButton onClick={editChapters} className="p-1" disabled={controlsDisabled} />
              <DeleteButton onClick={deleteChapters} className="p-1" />
            </>
          )}
        </div>
      }
    >
      <ChaptersList
        chapters={chapters}
        draggable={chapters.length > 1}
        selectedChapters={selectedChapters}
        disableControls={controlsDisabled}
        loading={loading}
        onSelect={selectChapter}
        onDeselect={deselectChapter}
        onDelete={deleteChapter}
        onEdit={editChapter}
        onCopy={copyChapter}
        onDragEnd={dragEnd}
      />
      <EditChapterModal />
      <EditChaptersModal
        workId={workId}
        title={`Editing ${selectedChaptersTitle} Chapters`}
        onClose={closeMultipleChaptersEdit}
        onDone={doneMultipleChaptersEdit}
      />
      <AddChapterModal workId={workId} />
    </ContentSection>
  );
};
