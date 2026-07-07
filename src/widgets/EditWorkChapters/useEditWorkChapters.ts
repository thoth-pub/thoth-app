'use client';

import { useEffect, useState } from 'react';

import { useCreateWorkChapter, useDeleteChapter, useWorkChapters, useWorkMoveRelation } from '@/src/entities/work';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

const NEW_CHAPTER_PREFIX = 'New Copy of ';

export const useEditWorkChapters = (workId: WorkId) => {
  const { chapters, isFetching, isLoading } = useWorkChapters({ workId });
  const { activeFormId, closeForm } = useFormStateMachine();
  const { moveWorkRelation } = useWorkMoveRelation();
  const { createChapter } = useCreateWorkChapter({
    onCompleted: (chapter) => {
      edit([chapter]);
    },
  });
  const { edit, finishEditing: finishEditingWorkChaptersEdit } = useWorkChaptersStateMachine();

  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  const { deleteChapter: deleteChapterMutation, deleteChapters: deleteChaptersMutation } = useDeleteChapter();

  const isMultipleChapters = chapters.length >= 2;
  const isMultipleChaptersSelected = selectedChapters.length > 1;

  const selectedChaptersTitle = `${selectedChapters.length} of ${chapters.length}`;

  useEffect(() => {
    if (isLoading || isFetching) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedChapters([]);
  }, [chapters.length]);

  const dragEnd = (data: WorkEntity[]) => {
    const reorderedChapters = data.map((chapter, index) => ({ ...chapter, ordinal: index + 1 }));

    const firstChangedChapter = reorderedChapters.find((chapter, index) => chapter.id !== chapters[index]?.id);

    if (!firstChangedChapter || !firstChangedChapter.relationId) return;

    moveWorkRelation({ workRelationId: firstChangedChapter.relationId, newOrdinal: firstChangedChapter.ordinal });
  };

  const selectChapter = (id: string) => {
    setSelectedChapters((selectedChapters) => [...selectedChapters, id]);
  };

  const deselectChapter = (id: string) => {
    setSelectedChapters((selectedChapters) => selectedChapters.filter((chapter) => chapter !== id));
  };

  const selectAllChapters = () => {
    if (selectedChapters.length === chapters.length) {
      setSelectedChapters([]);
      return;
    }

    setSelectedChapters(chapters.map((chapter) => chapter.id));
  };

  const editChapter = (id: string) => {
    const chapter = chapters.find((chapter) => chapter.id === id);

    if (!chapter) return;

    edit([chapter]);
  };

  const editChapters = () => {
    edit(chapters.filter((chapter) => selectedChapters.includes(chapter.id)));
  };

  const copyChapter = (id: string) => {
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
        fullTitle: `${NEW_CHAPTER_PREFIX} ${newTitles[0].fullTitle}`,
        subtitle: `${NEW_CHAPTER_PREFIX} ${newTitles[0].subtitle}`,
      };
    }

    createChapter({ chapter: newChapter, relatedWorkId: workId, ordinal: chapters.length + 1 });
  };

  const deleteChapter = async (id: string) => {
    await deleteChapterMutation(id);
  };

  const deleteChapters = async () => {
    const selected = [...selectedChapters];

    await deleteChaptersMutation(selected);
  };

  const closeMultipleChaptersEdit = () => {
    setSelectedChapters([]);
    closeForm();
    finishEditingWorkChaptersEdit();
  };

  const doneMultipleChaptersEdit = () => {
    closeMultipleChaptersEdit();
  };

  return {
    chapters,
    selectedChapters,
    isMultipleChapters,
    isMultipleChaptersSelected,
    selectedChaptersTitle,
    controlsDisabled: !!activeFormId,
    loading: isLoading || isFetching,
    dragEnd,
    selectChapter,
    deselectChapter,
    selectAllChapters,
    editChapter,
    editChapters,
    copyChapter,
    deleteChapter,
    deleteChapters,
    closeMultipleChaptersEdit,
    doneMultipleChaptersEdit,
  };
};
