import { useTransition } from 'react';

import { useBulkCreateWorks } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { convertOptionToString, getMainTitle, SeriesForUpdateItems } from '@/src/shared';
import { Button, TableBody, TableCell, TableHeader, TableRow, TableWrapper, TranslatedContent } from '@/src/shared/ui';

type PreviewStepProps = {
  works: WorkEntity[];
  chapters: WorkEntity[];
  serieses: SeriesForUpdateItems;
  onSubmit: () => void;
};

export const PreviewStep = (props: PreviewStepProps) => {
  const { works, chapters, serieses, onSubmit } = props;

  const { bulkCreateWorks } = useBulkCreateWorks();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(() => {
      bulkCreateWorks({
        works,
        serieses,
        chapters,
      });
      onSubmit();
    });
  };

  return (
    <>
      <TableWrapper>
        <TableHeader
          cells={['title', 'status', 'type', 'contributors', 'doi']}
          cellStyles={['pl-4 capitalize', 'capitalize', 'capitalize', 'capitalize', 'capitalize']}
        />
        <TableBody>
          {works.map((work) => {
            const title = getMainTitle(work.titles);

            return (
              <TableRow key={work.id}>
                <TableCell className="pl-4">{title.title}</TableCell>
                <TableCell>{convertOptionToString(work.status)}</TableCell>
                <TableCell>{convertOptionToString(work.type)}</TableCell>
                <TableCell>{work.contributions.map((contribution) => contribution.fullName).join(', ')}</TableCell>
                <TableCell>{work.doi}</TableCell>
              </TableRow>
            );
          })}
          {chapters.map((chapter) => {
            const title = getMainTitle(chapter.titles);
            return (
              <TableRow key={chapter.id}>
                <TableCell>{title.title}</TableCell>
                <TableCell>{convertOptionToString(chapter.status)}</TableCell>
                <TableCell>{convertOptionToString(chapter.type)}</TableCell>
                <TableCell>{chapter.contributions.map((contribution) => contribution.fullName).join(', ')}</TableCell>
                <TableCell>{chapter.doi}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableWrapper>
      <Button
        variant="contained"
        color="primary"
        className="m-auto max-w-max capitalize"
        onClick={handleSubmit}
        disabled={isPending}
      >
        <TranslatedContent content="actions.create" />
      </Button>
    </>
  );
};
