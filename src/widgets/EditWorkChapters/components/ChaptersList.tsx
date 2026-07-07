import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { CardsList } from '@/src/shared/ui';

import { ChaptersListItem } from './ChaptersListItem';

type ChaptersListProps = {
  draggable?: boolean;
  chapters: WorkEntity[];
  selectedChapters?: string[];
  disableControls?: boolean;
  loading?: boolean;
  onSelect?: (id: string) => void;
  onDeselect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDragEnd?: (data: WorkEntity[]) => void;
};

const emptySelectedChapters: NonNullable<ChaptersListProps['selectedChapters']> = [];

export const ChaptersList = (props: ChaptersListProps) => {
  const {
    chapters,
    selectedChapters = emptySelectedChapters,
    disableControls = false,
    draggable = false,
    loading = false,
    onSelect,
    onDeselect,
    onDelete,
    onEdit,
    onCopy,
    onDragEnd,
  } = props;

  return (
    <CardsList items={chapters} draggable={draggable} loading={loading} onDragEnd={onDragEnd}>
      {(draggable = false) => (
        <>
          {chapters.map((chapter) => (
            <ChaptersListItem
              key={chapter.id}
              chapter={chapter}
              draggable={draggable}
              selected={selectedChapters.includes(chapter.id)}
              disableControls={disableControls}
              onSelect={onSelect}
              onDeselect={onDeselect}
              onDelete={onDelete}
              onEdit={onEdit}
              onCopy={onCopy}
            />
          ))}
        </>
      )}
    </CardsList>
  );
};
