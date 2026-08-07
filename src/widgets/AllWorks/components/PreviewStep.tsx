import { useState, useTransition } from 'react';

import { useBulkCreateWorks } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import type { SeriesImportPlan } from '@/src/shared/types';
import {
  Button,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { convertOptionToString, getDisplayTitle } from '@/src/shared/utils';

type PreviewStepProps = {
  works: WorkEntity[];
  chapters: WorkEntity[];
  serieses: SeriesImportPlan;
  onSubmit: () => void;
};

export const PreviewStep = (props: PreviewStepProps) => {
  const { works, chapters, serieses, onSubmit } = props;

  const { bulkCreateWorks } = useBulkCreateWorks();
  const [isPending, startTransition] = useTransition();
  const [hasFailed, setHasFailed] = useState(false);

  // The import is awaited so the preview stays on screen while it runs, and stays on screen if
  // it fails: a bulk import is not atomic, so navigating away on failure would leave the user
  // with no idea what was created. The error notification is raised by useBulkCreateWorks;
  // rethrowing here would surface as an unhandled rejection.
  //
  // A failed import cannot be retried from this screen. The plan was built against the series
  // Thoth had before the attempt, so a group still marked `proposed` may name a series the
  // failed run already created — confirming again would create it a second time. The file has
  // to be parsed again against the refreshed series list, which useBulkCreateWorks invalidates.
  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await bulkCreateWorks({ works, serieses, chapters });
      } catch {
        setHasFailed(true);

        return;
      }

      onSubmit();
    });
  };

  // A work belongs to at most one planned series, so a flat lookup is enough. Works headed for
  // a series the import will have to create are labelled, so confirming is an informed choice.
  const seriesByWorkId = new Map(
    serieses.flatMap((group) =>
      group.works.map((work) => [work.id, { name: group.name, isNew: group.target.kind === 'proposed' }] as const),
    ),
  );

  return (
    <>
      <TableWrapper>
        <TableHeader
          cells={['title', 'status', 'type', 'contributors', 'doi', 'series']}
          cellStyles={['pl-4 capitalize', 'capitalize', 'capitalize', 'capitalize', 'capitalize', 'capitalize']}
        />
        <TableBody>
          {works.map((work) => {
            const title = getDisplayTitle(work.titles);
            const series = seriesByWorkId.get(work.id);

            return (
              <TableRow key={work.id}>
                <TableCell className="pl-4">{title.title}</TableCell>
                <TableCell>{convertOptionToString(work.status)}</TableCell>
                <TableCell>{convertOptionToString(work.type)}</TableCell>
                <TableCell>{work.contributions.map((contribution) => contribution.fullName).join(', ')}</TableCell>
                <TableCell>{work.doi}</TableCell>
                <TableCell>
                  {series && (
                    <>
                      {series.name}
                      {series.isNew && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs whitespace-nowrap text-amber-900">
                          <TranslatedContent content="will be created" />
                        </span>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {chapters.map((chapter) => {
            const title = getDisplayTitle(chapter.titles);
            return (
              <TableRow key={chapter.id}>
                <TableCell>{title.title}</TableCell>
                <TableCell>{convertOptionToString(chapter.status)}</TableCell>
                <TableCell>{convertOptionToString(chapter.type)}</TableCell>
                <TableCell>{chapter.contributions.map((contribution) => contribution.fullName).join(', ')}</TableCell>
                <TableCell>{chapter.doi}</TableCell>
                <TableCell />
              </TableRow>
            );
          })}
        </TableBody>
      </TableWrapper>
      {hasFailed && (
        <Typography color="error" className="text-center">
          <TranslatedContent content="bulk import failed reupload" />
        </Typography>
      )}
      <Button
        variant="contained"
        color="primary"
        className="m-auto max-w-max capitalize"
        onClick={handleSubmit}
        disabled={isPending || hasFailed}
      >
        <TranslatedContent content="actions.create" />
      </Button>
    </>
  );
};
