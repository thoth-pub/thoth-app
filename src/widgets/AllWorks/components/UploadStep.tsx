'use client';

import UploadIcon from '@mui/icons-material/Upload';
import { Activity, useState } from 'react';

import { useAllUserSerieses } from '@/src/entities/series';
import { useUser } from '@/src/entities/user';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { FORM_FIELDS } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { ImportIssue, ImportIssueCode, SeriesImportPlan } from '@/src/shared/types';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';
import { isCsv as isCsvFile, isXml as isXmlFile } from '@/src/shared/utils';

import { CSVParse } from './CSVParse';
import { XMLParse } from './XMLParse';

const { BULK_UPLOAD } = FORM_FIELDS;

type UploadStepProps = {
  onPreview?: (
    works: WorkEntity[],
    chapters: WorkEntity[],
    serieses: SeriesImportPlan,
    warnings: ImportIssue[],
  ) => void;
};

export const UploadStep = (props: UploadStepProps) => {
  const { onPreview } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const { userImprintsOptions } = useUser();
  const { serieses } = useAllUserSerieses();
  const [files, setFiles] = useState<FileList | null>(null);
  const [validationIssues, setValidationIssues] = useState<ImportIssue[]>([]);

  const isFileUploaded = files && files.length > 0;
  const file = isFileUploaded ? files[0] : null;
  const isCsv = file && isCsvFile(file);
  const isXml = file && isXmlFile(file);

  const handleIssues = (issues: ImportIssue[]) => {
    setValidationIssues(issues);
    setFiles(null);
  };

  /**
   * A problem with the upload itself, raised before either parser sees it, so it belongs to the
   * file rather than to any row or product.
   */
  const rejectFile = (code: ImportIssueCode, message: string) =>
    handleIssues([{ severity: 'error', code, message, source: { kind: 'file' } }]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValidationIssues([]);

    const uploadedFiles = event.target.files;
    const uploadedFile = uploadedFiles?.[0];

    if (uploadedFile && uploadedFile.size === 0) {
      rejectFile('file.validation', t('errors.emptyFile'));
      return;
    }

    if (uploadedFile && !isCsvFile(uploadedFile) && !isXmlFile(uploadedFile)) {
      rejectFile('file.validation', t('errors.unsupportedFileType'));
      return;
    }

    setFiles(uploadedFiles);
  };

  return (
    <div className="flex flex-col items-center gap-(--default-gap)">
      <Activity mode={isFileUploaded ? 'hidden' : 'visible'}>
        <Button
          className="capitalize"
          type="submit"
          component="label"
          variant="contained"
          tabIndex={-1}
          startIcon={<UploadIcon />}
        >
          <TranslatedContent content="actions.upload" />
          <input
            name={BULK_UPLOAD.name}
            className="hidden"
            type={BULK_UPLOAD.type}
            accept=".csv, .xml"
            onChange={handleFileChange}
          />
        </Button>
      </Activity>
      {isCsv && file && (
        <CSVParse
          file={file}
          imprints={userImprintsOptions}
          serieses={serieses}
          onValidationFailure={handleIssues}
          onPreview={onPreview}
        />
      )}
      {isXml && file && (
        <XMLParse
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
