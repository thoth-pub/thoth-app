'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useAllUserSerieses } from '@/src/entities/series';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { useUser } from '@/src/entities/user';
import { useSessionExpiry } from '@/src/features/auth/ui/SessionWatch/SessionWatch';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { FormFieldOption } from '@/src/shared/interfaces';
import type { ImprintMatchContext } from '@/src/shared/parsers/XMLParser/XMLParser';
import type { ImportIssue, ImportIssueCode, ImportPlan, ImportSource } from '@/src/shared/types';
import { FileDropzone, TranslatedContent, Typography } from '@/src/shared/ui';
import { isCsv as isCsvFile, isXml as isXmlFile } from '@/src/shared/utils';

import { CSVParse } from './CSVParse';
import { ImportPhaseStatus } from './ImportPhaseStatus';
import { hasOnixIssues, OnixIssueSummary } from './OnixIssueSummary';
import { XMLParse } from './XMLParse';

type UploadStepProps = {
  onPreview?: (plan: ImportPlan, warnings: ImportIssue[], source: ImportSource) => void;
};

type SelectedFile = {
  file: File;
  selectionId: number;
};

/** The settled identity a parser runs against: whose it is, and the imprints it matches. */
type ParserIdentity = {
  userId: string;
  /** The active ("Working in") publisher the imprints belong to, or null when none is selected. */
  publisherId: string | null;
  imprints: FormFieldOption[];
  /**
   * The Series list the identity settled on. It says only that the step is ready: a parser plans against its own
   * selection's read instead (thoth-app#317), because this list can be older than the file.
   */
  serieses: SeriesEntity[];
  /**
   * What the parser may say about an imprint the active publisher does not hold (thoth-app#284), taken from the same
   * settled identity: a token rotation reads as no identity and no linked publishers, which must not reach a parser.
   */
  imprintContext: ImprintMatchContext;
  /**
   * Whether the settled user is a Thoth superuser, so the CSV preflight can refuse a THOTH PDF location platform only a
   * superuser may create (thoth-app#320). Read only from an authoritative identity, so the default user's `false`
   * never reaches a parser.
   */
  isSuperuser: boolean;
};

const sameOptions = (a: FormFieldOption[], b: FormFieldOption[]) =>
  a.length === b.length &&
  a.every((option, index) => option.value === b[index].value && option.label === b[index].label);

const sameSerieses = (a: SeriesEntity[], b: SeriesEntity[]) =>
  a.length === b.length && a.every((series, index) => series === b[index]);

/**
 * What the current selection's own Series read came to: the list its parser plans against, or a failure. `epoch` is the
 * settled-publisher-set epoch the read was made in, and `accepted` is set once the step has taken the result in that
 * epoch.
 */
type SeriesRead = { selectionId: number; epoch: number; accepted: boolean } & (
  | { outcome: 'ready'; serieses: SeriesEntity[] }
  | { outcome: 'failed' }
);

/** The context is plain data built in a fixed order, so equal contexts serialise identically. */
const sameImprintContext = (a: ImprintMatchContext, b: ImprintMatchContext) => JSON.stringify(a) === JSON.stringify(b);

/** How many distinct source rows the issues point at; file-level findings name no row. */
const countIssueRows = (issues: ImportIssue[]): number =>
  new Set(issues.flatMap(({ source }) => (source.kind === 'csv' ? [source.row] : []))).size;

export const UploadStep = (props: UploadStepProps) => {
  const { onPreview } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const { user, userImprintsOptions, isAuthoritative, error: identityError } = useUser();
  const { expired: sessionExpired, desynced: sessionDesynced } = useSessionExpiry();
  const { activePublisher } = usePublisherStateMachine();
  const activePublisherId = activePublisher?.id ?? null;
  const {
    serieses,
    loading: seriesLoading,
    error: seriesError,
    settledPublishersIds,
    readSerieses,
  } = useAllUserSerieses();
  // What the parsers may say about an imprint the active publisher does not hold (thoth-app#284): only the active
  // publisher and the user's own linked publishers. Matching itself still uses `userImprintsOptions` alone.
  const imprintContext: ImprintMatchContext = {
    identityLoaded: isAuthoritative === true,
    activePublisher: activePublisher && { id: activePublisher.id, name: activePublisher.name },
    linkedPublishers: (user?.linkedPublishers ?? []).map(({ publisherId, publisherName, imprints }) => ({
      publisherId,
      publisherName,
      imprints: imprints.map(({ id, name }) => ({ id, name })),
    })),
  };
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [validationIssues, setValidationIssues] = useState<ImportIssue[]>([]);
  // Selection IDs come from a ref rather than the previous selection so they stay monotonic even
  // after `selectedFile` resets to null: a reused ID would let an old parser pass the staleness
  // check below.
  const selectionSequence = useRef(0);

  /*
    APP-AUTH-SESSION-EXPIRY-01 (thoth-app#285): a parser matches the file against the user's
    imprints and Series, so it is first mounted only on a settled identity - authoritative `me`
    and a settled Series list - never against the empty identity of a session that is still
    loading or has expired, which would report every imprint "not found".

    That identity is then latched. `isAuthoritative` also drops during an ordinary background
    refetch or a token rotation, and a parse must survive those: the parser keeps running against
    the latched identity. It is torn down - with the selection, and the sequence advanced so that
    nothing it still reports is shown - only on real identity loss: an expired session, a failed
    `me`, `me` settling on a different user, or a switch of the active publisher (the plan was
    built against the previous publisher's imprints). A session that is merely out of step with
    NextAuth (`desynced`) is not a loss: a running parser carries on.

    A change of user or of active publisher tells the user why their file was cleared; an expired
    session and a failed `me` say so themselves. When the user has linked publishers, the first
    latch also waits for the active publisher, which is restored asynchronously.
  */
  const [parserIdentity, setParserIdentity] = useState<ParserIdentity | null>(null);
  const [identityTeardowns, setIdentityTeardowns] = useState(0);
  const [selectionClearedByChange, setSelectionClearedByChange] = useState(false);

  const identityChanged =
    parserIdentity !== null &&
    ((isAuthoritative && user.id !== parserIdentity.userId) || activePublisherId !== parserIdentity.publisherId);
  const identityLost = sessionExpired || Boolean(identityError) || identityChanged;
  const activePublisherResolved = activePublisherId !== null || user.linkedPublishers.length === 0;
  // A failed Series lookup leaves `serieses` as an empty fallback, which a parser would read as
  // "this publisher has no Series" and plan new ones. It is therefore never latched: a parser
  // already running keeps the list it was mounted with, and a new one waits until the lookup succeeds.
  const identitySettled = isAuthoritative && !seriesLoading && !seriesError && activePublisherResolved && !identityLost;

  if (identityLost && parserIdentity !== null) {
    setParserIdentity(null);
    if (identityChanged && selectedFile !== null) setSelectionClearedByChange(true);
    setSelectedFile(null);
    setIdentityTeardowns((count) => count + 1);
  } else if (
    identitySettled &&
    (parserIdentity === null ||
      !sameOptions(parserIdentity.imprints, userImprintsOptions) ||
      !sameSerieses(parserIdentity.serieses, serieses) ||
      !sameImprintContext(parserIdentity.imprintContext, imprintContext) ||
      parserIdentity.isSuperuser !== user.isSuperuser)
  ) {
    setParserIdentity({
      userId: user.id,
      isSuperuser: user.isSuperuser,
      publisherId: activePublisherId,
      imprints: userImprintsOptions,
      serieses,
      imprintContext,
    });
  }

  useEffect(() => {
    if (identityTeardowns > 0) selectionSequence.current += 1;
  }, [identityTeardowns]);

  /*
    APP-IMPORT-SERIES-FRESH-01 (thoth-app#317): the latched Series list above says only that the step is ready. It can
    be older than the file - the query serves a cached list for minutes, and while it re-reads - so no parser plans
    against it. Each accepted selection reads the Series itself, directly and outside the query cache, once the
    identity is latched and the Series hook's own identity is settled. Its parser mounts once, on that read's result,
    and keeps that list for its life.

    A result counts only for the current selection, from its latest read, while the hook is still settled on the
    linked-publisher set the read was made with. A change of that set starts a new read with the new set. An unsettled
    hook identity (a NextAuth desync, which is not identity loss) is not "no linked publishers": the selection makes
    no read and mounts nothing until the identity settles, and then reads again, even on the same set. A parser
    already running and a failed selection are left as they are. A failed read keeps the selection and says the
    account details are unavailable; choosing the file again reads again. A settled user with no linked publishers
    makes no read and parses against no Series, as before.
  */
  const [seriesRead, setSeriesRead] = useState<SeriesRead | null>(null);
  const latestRead = useRef<{ readId: number; selectionId: number; epoch: number } | null>(null);
  const readSequence = useRef(0);

  const latched = parserIdentity !== null;
  const selectionId = selectedFile?.selectionId ?? null;
  const publishersKey = settledPublishersIds === null ? null : JSON.stringify([...settledPublishersIds].sort());
  const noLinkedPublishers = settledPublishersIds !== null && settledPublishersIds.length === 0;

  // The epoch moves on at every rendered change of the settled set, to or from unsettled too, so a set that changes
  // and changes back is a new epoch.
  const [publishersEpoch, setPublishersEpoch] = useState({ publishersKey, epoch: 0 });
  const epoch = publishersEpoch.publishersKey === publishersKey ? publishersEpoch.epoch : publishersEpoch.epoch + 1;
  if (epoch !== publishersEpoch.epoch) setPublishersEpoch({ publishersKey, epoch });

  /*
    A read is checked when it resolves, but React can render its result in the same pass as a later change of the set,
    or after one, before the commit that stops the read counting. So a result is checked again when it first renders:
    it is taken only in the epoch its read was made in. Otherwise it is dropped, and the selection reads again once
    the hook is settled. A result once taken stays, so a running parser and a failed selection are left alone.
  */
  const currentRead = seriesRead !== null && seriesRead.selectionId === selectionId ? seriesRead : null;
  const counted = currentRead !== null && (currentRead.accepted || currentRead.epoch === epoch);
  if (currentRead !== null && !currentRead.accepted) {
    setSeriesRead(counted ? { ...currentRead, accepted: true } : null);
  }
  const selectionRead = counted ? currentRead : null;

  if (latched && selectionId !== null && selectionRead === null && noLinkedPublishers) {
    setSeriesRead({ selectionId, epoch, accepted: true, outcome: 'ready', serieses: [] });
  }

  const readOutcome = selectionRead?.outcome ?? 'waiting';

  // A layout effect, so that a read made for another selection or in another epoch stops counting at the commit that
  // replaces it, before any later result can resolve.
  useLayoutEffect(() => {
    const latest = latestRead.current;
    if (latest !== null && (latest.selectionId !== selectionId || latest.epoch !== epoch)) {
      latestRead.current = null;
    }

    if (selectionId === null || !latched || settledPublishersIds === null) return;
    if (settledPublishersIds.length === 0 || readOutcome !== 'waiting' || latestRead.current !== null) return;

    readSequence.current += 1;
    const readId = readSequence.current;
    latestRead.current = { readId, selectionId, epoch };
    const counts = () => latestRead.current?.readId === readId && selectionSequence.current === selectionId;
    // A result already taken for this selection is never replaced.
    const take = (result: SeriesRead) =>
      setSeriesRead((current) => (current?.selectionId === selectionId && current.accepted ? current : result));

    readSerieses(settledPublishersIds).then(
      (selectionSerieses) => {
        if (counts()) take({ selectionId, epoch, accepted: false, outcome: 'ready', serieses: selectionSerieses });
      },
      () => {
        if (counts()) take({ selectionId, epoch, accepted: false, outcome: 'failed' });
      },
    );
  }, [selectionId, latched, epoch, settledPublishersIds, readOutcome, readSerieses]);

  const file = selectedFile?.file ?? null;
  const isCsv = file ? isCsvFile(file) : false;
  const isXml = file ? isXmlFile(file) : false;

  const nextSelectionId = () => {
    selectionSequence.current += 1;
    return selectionSequence.current;
  };

  /**
   * A parser can fail after its file has already been replaced: the old parser unmounts, but its
   * asynchronous validation still runs to completion. Each failure is therefore scoped to the
   * selection that produced it, and a stale one is dropped — acting on it would clear or overwrite
   * the newer selection's state.
   */
  const handleParserFailure = (selectionId: number) => (issues: ImportIssue[]) => {
    if (selectionId !== selectionSequence.current) return;

    setValidationIssues(issues);
    setSelectedFile(null);
  };

  /**
   * Cancelling an ONIX validation says nothing about the file, so nothing is reported: the step
   * simply starts over. Like a failure, a cancellation belongs to the selection that raised it, and
   * one from a superseded selection is dropped.
   */
  const handleParserCancel = (selectionId: number) => () => {
    if (selectionId !== selectionSequence.current) return;

    setValidationIssues([]);
    setSelectedFile(null);
  };

  /**
   * A problem with the upload itself, raised before either parser sees it, so it belongs to the
   * file rather than to any row or product. A rejected attempt is still a new selection: it
   * advances the sequence so that any parser still validating the previous file becomes stale.
   */
  const rejectFile = (code: ImportIssueCode, message: string) => {
    nextSelectionId();
    setValidationIssues([{ severity: 'error', code, message, source: { kind: 'file' } }]);
    setSelectedFile(null);
  };

  const handleFileSelect = (selectedFile: File) => {
    setValidationIssues([]);
    setSelectionClearedByChange(false);

    if (selectedFile.size === 0) {
      rejectFile('file.validation', t('errors.emptyFile'));
      return;
    }

    if (!isCsvFile(selectedFile) && !isXmlFile(selectedFile)) {
      rejectFile('file.validation', t('errors.unsupportedFileType'));
      return;
    }

    setSelectedFile({ file: selectedFile, selectionId: nextSelectionId() });
  };

  return (
    <div className="flex flex-col items-center gap-(--default-gap)">
      <FileDropzone
        accept={['.csv', '.xml']}
        actionLabel={<TranslatedContent content={file ? 'fileUpload.replace' : 'fileUpload.browse'} />}
        dragActiveLabel={<TranslatedContent content="bulkUpload.drop" />}
        onFileSelect={handleFileSelect}
      >
        <Typography className={file ? 'font-semibold' : undefined}>
          <TranslatedContent
            content={file ? 'fileUpload.selected' : 'bulkUpload.instructions'}
            options={{ filename: file?.name }}
          />
        </Typography>
      </FileDropzone>
      {selectionClearedByChange && (
        <Typography role="status" data-testid="upload-session-changed">
          <TranslatedContent content="upload.session.changed" />
        </Typography>
      )}
      {parserIdentity === null && (
        <>
          {sessionExpired ? (
            <Typography role="alert" data-testid="upload-session-expired">
              <TranslatedContent content="upload.session.expired" />
            </Typography>
          ) : identityError || seriesError || sessionDesynced ? (
            <Typography role="alert" data-testid="upload-session-unavailable">
              <TranslatedContent content="upload.session.unavailable" />
            </Typography>
          ) : (
            <ImportPhaseStatus content="upload.session.loading" data-testid="upload-session-loading" />
          )}
        </>
      )}
      {/* Once latched, the current selection waits for its own Series read, or says that read failed. */}
      {parserIdentity && selectedFile && readOutcome === 'waiting' && (
        <ImportPhaseStatus content="upload.session.loading" data-testid="upload-session-loading" />
      )}
      {parserIdentity && selectedFile && readOutcome === 'failed' && (
        <Typography role="alert" data-testid="upload-session-unavailable">
          <TranslatedContent content="upload.session.unavailable" />
        </Typography>
      )}
      {parserIdentity && isCsv && selectedFile && selectionRead?.outcome === 'ready' && (
        <CSVParse
          key={`csv-${selectedFile.selectionId}`}
          file={selectedFile.file}
          imprints={parserIdentity.imprints}
          imprintContext={parserIdentity.imprintContext}
          isSuperuser={parserIdentity.isSuperuser}
          serieses={selectionRead.serieses}
          onValidationFailure={handleParserFailure(selectedFile.selectionId)}
          onPreview={onPreview}
        />
      )}
      {parserIdentity && isXml && selectedFile && selectionRead?.outcome === 'ready' && (
        <XMLParse
          key={`xml-${selectedFile.selectionId}`}
          file={selectedFile.file}
          imprints={parserIdentity.imprints}
          imprintContext={parserIdentity.imprintContext}
          serieses={selectionRead.serieses}
          onValidationFailure={handleParserFailure(selectedFile.selectionId)}
          onCancel={handleParserCancel(selectedFile.selectionId)}
          onPreview={onPreview}
        />
      )}

      {/*
        A rejected ONIX file is summarised by what each issue means for the import, with repeated
        occurrences of one problem grouped and every issue still reachable in its technical details.
        Its warnings are kept too: the errors are what stopped it, but the warnings say what else
        was handled or would have been lost.
      */}
      {hasOnixIssues(validationIssues) ? (
        <OnixIssueSummary issues={validationIssues} />
      ) : (
        <>
          {/*
            The aggregate line orients, never replaces: every individual issue below stays rendered.
            It only appears when there are several findings that belong to actual rows — a lone
            finding or a file-level failure explains itself.
          */}
          {validationIssues.length > 1 && countIssueRows(validationIssues) > 0 && (
            <Typography className="font-semibold" data-testid="import-issues-summary">
              <TranslatedContent
                content="bulkImport.issuesSummary"
                options={{ count: validationIssues.length, rows: countIssueRows(validationIssues) }}
              />
            </Typography>
          )}

          {/*
            A rejected upload can still carry warnings — the errors are what stopped it, but the
            warnings say what else the file would have lost, so they are shown rather than dropped.
            Issue order is the parser's, which is source-file order. The severity is said in words
            and the text keeps the ordinary colour: warning-coloured prose is too pale to read.
          */}
          <ul>
            {validationIssues.map((issue, index) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- static issue list, regenerated wholesale on each validation; messages may repeat
              <Typography key={index}>
                <Typography component="span">{index + 1}.</Typography>{' '}
                <Typography component="span" className="font-semibold">
                  <TranslatedContent content={`issueSummary.severity.${issue.severity}`} />:
                </Typography>{' '}
                {issue.message}
              </Typography>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
