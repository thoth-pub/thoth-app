'use client';

import { useState } from 'react';

import { useAllUserSerieses } from '@/src/entities/series';
import { useUser } from '@/src/entities/user';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { ImportIssue, ImportIssueCode, ImportPlan } from '@/src/shared/types';
import { FileDropzone, TranslatedContent, Typography } from '@/src/shared/ui';
import { isCsv as isCsvFile, isXml as isXmlFile } from '@/src/shared/utils';

import { CSVParse } from './CSVParse';
import { XMLParse } from './XMLParse';

type UploadStepProps = {
  onPreview?: (plan: ImportPlan, warnings: ImportIssue[]) => void;
};

type SelectedFile = {
  file: File;
  selectionId: number;
};

export const UploadStep = (props: UploadStepProps) => {
  const { onPreview } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const { userImprintsOptions } = useUser();
  const { serieses } = useAllUserSerieses();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [validationIssues, setValidationIssues] = useState<ImportIssue[]>([]);

  const file = selectedFile?.file ?? null;
  const isCsv = file ? isCsvFile(file) : false;
  const isXml = file ? isXmlFile(file) : false;

  const handleIssues = (issues: ImportIssue[]) => {
    setValidationIssues(issues);
    setSelectedFile(null);
  };

  /**
   * A problem with the upload itself, raised before either parser sees it, so it belongs to the
   * file rather than to any row or product.
   */
  const rejectFile = (code: ImportIssueCode, message: string) =>
    handleIssues([{ severity: 'error', code, message, source: { kind: 'file' } }]);

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

    setSelectedFile((current) => ({
      file: selectedFile,
      selectionId: (current?.selectionId ?? 0) + 1,
    }));
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
      {isCsv && file && (
        <CSVParse
          key={`csv-${selectedFile?.selectionId}`}
          file={file}
          imprints={userImprintsOptions}
          serieses={serieses}
          onValidationFailure={handleIssues}
          onPreview={onPreview}
        />
      )}
      {isXml && file && (
        <XMLParse
          key={`xml-${selectedFile?.selectionId}`}
          file={file}
          imprints={userImprintsOptions}
          serieses={serieses}
          onValidationFailure={handleIssues}
          onPreview={onPreview}
        />
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
