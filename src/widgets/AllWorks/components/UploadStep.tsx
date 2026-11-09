'use client';

import { useEffect, useRef, useState } from 'react';

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

/** The settled identity a parser runs against: whose it is, and the imprints and Series it matches. */
type ParserIdentity = {
  userId: string;
  /** The active ("Working in") publisher the imprints belong to, or null when none is selected. */
  publisherId: string | null;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  /**
   * What the parser may say about an imprint the active publisher does not hold (thoth-app#284), taken from the same
   * settled identity: a token rotation reads as no identity and no linked publishers, which must not reach a parser.
   */
  imprintContext: ImprintMatchContext;
};

const sameOptions = (a: FormFieldOption[], b: FormFieldOption[]) =>
  a.length === b.length &&
  a.every((option, index) => option.value === b[index].value && option.label === b[index].label);

const sameSerieses = (a: SeriesEntity[], b: SeriesEntity[]) =>
  a.length === b.length && a.every((series, index) => series === b[index]);

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
  const { serieses, loading: seriesLoading, error: seriesError } = useAllUserSerieses();
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
  // already running keeps the list it latched, and a new one waits until the lookup succeeds.
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
      !sameImprintContext(parserIdentity.imprintContext, imprintContext))
  ) {
    setParserIdentity({
      userId: user.id,
      publisherId: activePublisherId,
      imprints: userImprintsOptions,
      serieses,
      imprintContext,
    });
  }

  useEffect(() => {
    if (identityTeardowns > 0) selectionSequence.current += 1;
  }, [identityTeardowns]);

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
      {parserIdentity && isCsv && selectedFile && (
        <CSVParse
          key={`csv-${selectedFile.selectionId}`}
          file={selectedFile.file}
          imprints={parserIdentity.imprints}
          imprintContext={parserIdentity.imprintContext}
          serieses={parserIdentity.serieses}
          onValidationFailure={handleParserFailure(selectedFile.selectionId)}
          onPreview={onPreview}
        />
      )}
      {parserIdentity && isXml && selectedFile && (
        <XMLParse
          key={`xml-${selectedFile.selectionId}`}
          file={selectedFile.file}
          imprints={parserIdentity.imprints}
          imprintContext={parserIdentity.imprintContext}
          serieses={parserIdentity.serieses}
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
