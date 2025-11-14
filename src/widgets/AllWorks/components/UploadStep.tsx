'use client';

import CSVFileValidator from 'csv-file-validator';
import UploadIcon from '@mui/icons-material/Upload';

import { Button, Typography } from '@/src/shared/ui';
import { useForm } from 'react-hook-form';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useEffect, useState } from 'react';
import { titleValidation } from '@/src/entities/work/model/work.validation';
import { workStatusValidation, workTypeValidation } from '@/src/shared/utils/validations';
import { validateXml } from '@/app/actions';

type UploadStepProps = {
  onPreviousStep: () => void;
  onNextStep: () => void;
};

const { BULK_UPLOAD } = FORM_FIELDS;

const csvConfig = {
  headers: [
    {
      name: 'publisher',
      inputName: 'publisher',
      required: true,
      requiredError: (headerName: string, rowNumber: number, columnNumber: number) => {
        return `${headerName} is required in the ${rowNumber} row / ${columnNumber} column`;
      },
    },
    {
      name: 'work_type',
      inputName: 'workType',
      required: true,
      validate: (field: string | number | boolean) => workTypeValidation.safeParse(`${field}`).success,
      validateError: (headerName: string, rowNumber: number, columnNumber: number) => {
        return `${headerName} is not valid in the ${rowNumber} row / ${columnNumber} column`;
      },
    },
    {
      name: 'work_status',
      inputName: 'workStatus',
      required: true,
      // validate: (workStatus: string) => workStatusValidation.safeParse(workStatus).success,
      // validateError: (workStatus: string) => workStatusValidation.safeParse(workStatus).error?.message,
    },
    {
      name: 'title',
      inputName: 'title',
      required: true,
      // validate: (title: string) => titleValidation.safeParse(title).success,
      // validateError: (title: string) => titleValidation.safeParse(title).error?.message,
    },
    {
      name: 'subtitle',
      inputName: 'subtitle',
      required: false,
      // validate: (subtitle: string) => titleValidation.safeParse(subtitle).success,
      // validateError: (subtitle: string) => titleValidation.safeParse(subtitle).error?.message,
    },
    {
      name: 'edition',
      inputName: 'edition',
      required: false,
    },
    {
      name: 'publication_date',
      inputName: 'publicationDate',
      required: false,
    },
    {
      name: 'withdrawn_date',
      inputName: 'publicationDate',
      required: false,
    },
    {
      name: 'place_of_publication',
      inputName: 'placeOfPublication',
      required: false,
    },
    {
      name: 'cover_url',
      inputName: 'coverUrl',
      required: false,
    },
    {
      name: 'doi',
      inputName: 'doi',
      required: false,
    },
    {
      name: 'page_count',
      inputName: 'pageCount',
      required: false,
    },
    {
      name: 'page_breakdown',
      inputName: 'pageBreakdown',
      required: false,
    },
    {
      name: 'image_count',
      inputName: 'imageCount',
      required: false,
    },
    {
      name: 'table_count',
      inputName: 'tableCount',
      required: false,
    },
    {
      name: 'audio_count',
      inputName: 'audioCount',
      required: false,
    },
    {
      name: 'video_count',
      inputName: 'videoCount',
      required: false,
    },
    {
      name: 'license',
      inputName: 'license',
      required: false,
    },
    {
      name: 'copyright_holder',
      inputName: 'John Doe',
      required: false,
    },
    {
      name: 'landing_page',
      inputName: 'landingPage',
      required: false,
    },

    {
      name: 'short_abstract',
      inputName: 'shortAbstract',
      required: false,
    },
    {
      name: 'long_abstract',
      inputName: 'longAbstract',
      required: false,
    },
    // { name: 'contribution_1_first_name', inputName: 'contribution1FirstName', required: false },
    // { name: 'contribution_1_surname', inputName: 'contribution1Surname', required: false },
    // { name: 'contribution_1_role', inputName: 'contribution1Role', required: false },
    // { name: 'contribution_1_biography', inputName: 'contribution1Biography', required: false },
    // { name: 'contribution_1_orcid', inputName: 'contribution1Orcid', required: false },
    // { name: 'contribution_1_website', inputName: 'contribution1Website', required: false },
    // {
    //   name: 'contribution_1_affiliation_position',
    //   inputName: 'contribution_1_affiliation_institution_name',
    //   required: false,
    // },
    // {
    //   name: 'contribution_1_affiliation_institution_name',
    //   inputName: 'contribution1AffiliationInstitutionName',
    //   required: false,
    // },
    // {
    //   name: 'contribution_1_affiliation_institution_ror',
    //   inputName: 'contribution1AffiliationInstitutionRor',
    //   required: false,
    // },
    // { name: 'original_language', inputName: 'originalLanguage', required: false },
    // { name: 'translated_from_language', inputName: 'translatedFromLanguage', required: false },
    // { name: 'translated_into_language', inputName: 'translatedIntoLanguage', required: false },
    // { name: 'thema_subjects', inputName: 'themaSubjects', required: false },
    // { name: 'bic_subjects', inputName: 'bicSubjects', required: false },
    // { name: 'bisac_subjects', inputName: 'bisacSubjects', required: false },
    // { name: 'keywords', inputName: 'keywords', required: false },
    // { name: 'publication_paperback_isbn', inputName: 'publicationPaperbackIsbn', required: false },
    // {
    //   name: 'publication_paperback_price_1_currency_code',
    //   inputName: 'publicationPaperbackPrice1CurrencyCode',
    //   required: false,
    // },
    // {
    //   name: 'publication_paperback_price_1_unit_price',
    //   inputName: 'publicationPaperbackPrice1UnitPrice',
    //   required: false,
    // },
    // { name: 'publication_hardback_isbn', inputName: 'publicationHardbackIsbn', required: false },
    // {
    //   name: 'publication_hardback_price_1_currency_code',
    //   inputName: 'publicationHardbackPrice1CurrencyCode',
    //   required: false,
    // },
    // {
    //   name: 'publication_hardback_price_1_unit_price',
    //   inputName: 'publicationHardbackPrice1UnitPrice',
    //   required: false,
    // },
    // { name: 'publication_pdf_isbn', inputName: 'publicationPdfIsbn', required: false },
    // { name: 'publication_pdf_location_landing_page', inputName: 'publicationPdfLocationLandingPage', required: false },
    // { name: 'publication_pdf_location_full_text_url', inputName: 'publicationPdfLocationFullTextUrl', required: false },
    // { name: 'publication_pdf_location_platform', inputName: 'publicationPdfLocationPlatform', required: false },
    // { name: 'series_name', inputName: 'seriesName', required: false },
    // { name: 'series_issn', inputName: 'seriesIssn', required: false },
    // { name: 'series_issue_number', inputName: 'seriesIssueNumber', required: false },
  ],
};

export const UploadStep = (props: UploadStepProps) => {
  const { onPreviousStep, onNextStep } = props;

  const { register, handleSubmit } = useForm();

  const [files, setFiles] = useState<FileList | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  const validateCsvFile = (file: File) => {
    CSVFileValidator(file, csvConfig)
      .then((csvData) => {
        const isErrors = csvData.inValidData.length > 0;

        if (isErrors) {
          const errors = csvData.inValidData.map((error) => error.message);

          setFiles(null);
          setValidationErrors(errors);
          return;
        }

        setValidationErrors([]);
        setIsValid(true);
      })
      .catch((err) => {
        setFiles(null);
      });
  };

  const validateXMLFile = async (file: File) => {
    const response = await validateXml(file);
    // const reader = new FileReader();
    // reader.onload = (event) => {
    //   const xml = event.target?.result;
    //   console.log(xml);
    // };
    // reader.readAsText(file);
  };

  useEffect(() => {
    if (!files || files.length === 0) return;

    const file = files[0];

    const isCsv = file.type === 'text/csv';
    const isXml = file.type === 'text/xml';

    if (!isCsv && !isXml) return;

    if (isCsv) {
      validateCsvFile(file);
      return;
    }

    validateXMLFile(file);
  }, [files]);

  return (
    <div className="flex flex-col items-center gap-[var(--default-gap)]">
      <Button
        type="submit"
        component="label"
        variant="contained"
        tabIndex={-1}
        startIcon={<UploadIcon />}
        disabled={!!files}
      >
        Upload files
        <input
          {...register(BULK_UPLOAD.name)}
          className="hidden"
          type={BULK_UPLOAD.type}
          accept=".csv, .xml"
          onChange={(event) => setFiles(event.target.files)}
        />
      </Button>
      <ul>
        {validationErrors.map((error, index) => (
          <Typography key={index} color="error">
            {error}
          </Typography>
        ))}
      </ul>
      <div className="flex w-full justify-between gap-[var(--default-gap)]">
        <Button onClick={onPreviousStep}>Previous Step</Button>
        <Button onClick={onNextStep} disabled={!isValid}>
          Next Step
        </Button>
      </div>
    </div>
  );
};
