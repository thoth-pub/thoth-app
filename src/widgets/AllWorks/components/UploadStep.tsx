'use client';

import UploadIcon from '@mui/icons-material/Upload';

import { Button, Typography } from '@/src/shared/ui';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useState } from 'react';
import { validateXml } from '@/app/actions';
import { FormFieldOption } from '@/src/shared';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { CSVParse } from './CSVParse';

const { BULK_UPLOAD } = FORM_FIELDS;

type UploadStepProps = {
  imprintsOptions: FormFieldOption[];
  serieses: SeriesEntity[];
};

export const UploadStep = (props: UploadStepProps) => {
  const { imprintsOptions, serieses } = props;

  const [files, setFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [xmlData, setXmlData] = useState<string | null>(null);

  const isFileUploaded = files && files.length > 0;
  const isCsv = isFileUploaded && files[0].type === 'text/csv';
  const isXml = isFileUploaded && files[0].type === 'text/xml';

  const validateXMLFile = async (file: File) => {
    const response = await validateXml(file);

    if (response.status === 'error') {
      setValidationErrors(['Invalid XML file']);
      // setIsValid(false);
      return;
    }

    setValidationErrors([]);
    // setIsValid(true);
    setXmlData(response.data ?? null);
  };

  return (
    <div className="flex flex-col items-center gap-[var(--default-gap)]">
      <Button type="submit" component="label" variant="contained" tabIndex={-1} startIcon={<UploadIcon />}>
        Upload files
        <input
          name={BULK_UPLOAD.name}
          className="hidden"
          type={BULK_UPLOAD.type}
          accept=".csv, .xml"
          onChange={(event) => setFiles(event.target.files)}
        />
      </Button>
      {isCsv && (
        <CSVParse
          file={files[0]}
          imprints={imprintsOptions}
          serieses={serieses}
          onValidationFailure={setValidationErrors}
        />
      )}
      {validationErrors.length > 0 && (
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
      )}
      {xmlData && typeof xmlData === 'string' && (
        <Typography variant="body2" component="pre">
          {xmlData}
        </Typography>
      )}
    </div>
  );
};
