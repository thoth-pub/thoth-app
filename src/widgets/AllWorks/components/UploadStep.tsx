'use client';

import { useRef, useState } from 'react';

import { useAllUserSerieses } from '@/src/entities/series';
import { useUser } from '@/src/entities/user';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { ImportIssue, ImportIssueCode, ImportPlan, ImportSource } from '@/src/shared/types';
import { FileDropzone, TranslatedContent, Typography } from '@/src/shared/ui';
import { isCsv as isCsvFile, isXml as isXmlFile } from '@/src/shared/utils';

import { CSVParse } from './CSVParse';
import { XMLParse } from './XMLParse';

type UploadStepProps = {
  onPreview?: (plan: ImportPlan, warnings: ImportIssue[], source: ImportSource) => void;
};

type SelectedFile = {
  file: File;
  selectionId: number;
};

/** How many distinct source rows the issues point at; file-level findings name no row. */
const countIssueRows = (issues: ImportIssue[]): number =>
  new Set(issues.flatMap(({ source }) => (source.kind === 'csv' ? [source.row] : []))).size;

export const UploadStep = (props: UploadStepProps) => {
  const { onPreview } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const { userImprintsOptions } = useUser();
  const { serieses } = useAllUserSerieses();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [validationIssues, setValidationIssues] = useState<ImportIssue[]>([]);
  // Selection IDs come from a ref rather than the previous selection so they stay monotonic even
  // after `selectedFile` resets to null: a reused ID would let an old parser pass the staleness
  // check below.
  const selectionSequence = useRef(0);

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
      {isCsv && selectedFile && (
        <CSVParse
          key={`csv-${selectedFile.selectionId}`}
          file={selectedFile.file}
          imprints={userImprintsOptions}
          serieses={serieses}
          onValidationFailure={handleParserFailure(selectedFile.selectionId)}
          onPreview={onPreview}
        />
      )}
      {isXml && selectedFile && (
        <XMLParse
          key={`xml-${selectedFile.selectionId}`}
          file={selectedFile.file}
          imprints={userImprintsOptions}
          serieses={serieses}
          onValidationFailure={handleParserFailure(selectedFile.selectionId)}
          onPreview={onPreview}
        />
      )}

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
        Issue order is the parser's, which is source-file order.
      */}
      <ul>
        {validationIssues.map((issue, index) => (
          // eslint-disable-next-line @eslint-react/no-array-index-key -- static issue list, regenerated wholesale on each validation; messages may repeat
          <Typography key={index} color={issue.severity === 'error' ? 'error' : 'warning.main'}>
            <Typography component="span" color="inherit">
              {index + 1}.
            </Typography>{' '}
            {issue.message}
          </Typography>
        ))}
      </ul>
    </div>
  );
};
