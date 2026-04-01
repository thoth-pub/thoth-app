'use client';

import UploadIcon from '@mui/icons-material/Upload';
import { Activity, useState } from 'react';

import { useAllUserSerieses } from '@/src/entities/series';
import { useUser } from '@/src/entities/user';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { FORM_FIELDS } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { SeriesForUpdateItems } from '@/src/shared/types';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';
import { isCsv as isCsvFile, isXml as isXmlFile } from '@/src/shared/utils';

import { CSVParse } from './CSVParse';
import { XMLParse } from './XMLParse';

const { BULK_UPLOAD } = FORM_FIELDS;

type UploadStepProps = {
  onPreview?: (works: WorkEntity[], chapters: WorkEntity[], serieses: SeriesForUpdateItems) => void;
};

export const UploadStep = (props: UploadStepProps) => {
  const { onPreview } = props;

  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const { userImprintsOptions } = useUser();
  const { serieses } = useAllUserSerieses();
  const [files, setFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isFileUploaded = files && files.length > 0;
  const file = isFileUploaded ? files[0] : null;
  const isCsv = file && isCsvFile(file);
  const isXml = file && isXmlFile(file);

  const handleErrors = (errors: string[]) => {
    setValidationErrors(errors);
    setFiles(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([]);

    const uploadedFiles = event.target.files;
    const uploadedFile = uploadedFiles?.[0];

    if (uploadedFile && uploadedFile.size === 0) {
      handleErrors([t('errors.emptyFile')]);
      return;
    }

    if (uploadedFile && !isCsvFile(uploadedFile) && !isXmlFile(uploadedFile)) {
      handleErrors([t('errors.unsupportedFileType')]);
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
          onValidationFailure={handleErrors}
          onPreview={onPreview}
        />
      )}
      {isXml && file && (
        <XMLParse
          file={file}
          imprints={userImprintsOptions}
          serieses={serieses}
          onValidationFailure={handleErrors}
          onPreview={onPreview}
        />
      )}

      <ul>
        {validationErrors.map((error, index) => (
          <Typography key={index} color="error">
            <Typography component="span" color="inherit">
              {index + 1}.
            </Typography>{' '}
            {error}
          </Typography>
        ))}
      </ul>
    </div>
  );
};
