'use client';

import UploadIcon from '@mui/icons-material/Upload';
import { Activity, useState } from 'react';

import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { FormFieldOption, SeriesForUpdateItems } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Button, Typography } from '@/src/shared/ui';

import { CSVParse } from './CSVParse';
import { XMLParse } from './XMLParse';

const { BULK_UPLOAD } = FORM_FIELDS;

type UploadStepProps = {
  imprintsOptions: FormFieldOption[];
  serieses: SeriesEntity[];
  onPreview?: (works: WorkEntity[], chapters: WorkEntity[], serieses: SeriesForUpdateItems) => void;
};

export const UploadStep = (props: UploadStepProps) => {
  const { imprintsOptions, serieses, onPreview } = props;

  const [files, setFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isFileUploaded = files && files.length > 0;
  const isCsv = isFileUploaded && files[0].type === 'text/csv';
  const isXml = isFileUploaded && files[0].type === 'text/xml';

  const handleErrors = (errors: string[]) => {
    setValidationErrors(errors);
    setFiles(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([]);
    setFiles(event.target.files);
  };

  return (
    <div className="flex flex-col items-center gap-[var(--default-gap)]">
      <Activity mode={isFileUploaded ? 'hidden' : 'visible'}>
        <Button type="submit" component="label" variant="contained" tabIndex={-1} startIcon={<UploadIcon />}>
          Upload files
          <input
            name={BULK_UPLOAD.name}
            className="hidden"
            type={BULK_UPLOAD.type}
            accept=".csv, .xml"
            onChange={handleFileChange}
          />
        </Button>
      </Activity>
      {isCsv && (
        <CSVParse
          file={files[0]}
          imprints={imprintsOptions}
          serieses={serieses}
          onValidationFailure={handleErrors}
          onPreview={onPreview}
        />
      )}
      {isXml && (
        <XMLParse
          file={files[0]}
          imprints={imprintsOptions}
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
