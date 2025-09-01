import {
  dateValidation,
  optionalPositiveIntValidation,
  optionalStringValidation,
  optionalUrlValidation,
  requiredIntValidation,
  requiredStingValidation,
  timestampValidation,
} from './core';

const titleValidation = requiredStingValidation;
const subtitleValidation = optionalStringValidation;
const reference = optionalStringValidation;

const editionValidation = requiredIntValidation;

const publicationDateValidation = dateValidation;
const withdrawnDateValidation = dateValidation;

const placeValidation = optionalStringValidation;

const pagesCountValidation = optionalPositiveIntValidation;

const imageCountValidation = optionalPositiveIntValidation;

const tableCountValidation = optionalPositiveIntValidation;

const audioCountValidation = optionalPositiveIntValidation;

const videoCountValidation = optionalPositiveIntValidation;

const licenceValidation = optionalUrlValidation;

const copyrightHolder = optionalStringValidation;

const landingPageValidation = optionalUrlValidation;

const iccn = optionalStringValidation;

const oclcValidation = optionalStringValidation;

const shortAbstractValidation = optionalStringValidation;

const longAbstractValidation = optionalStringValidation;

const generalNoteValidation = optionalStringValidation;

const bibliographyNoteValidation = optionalStringValidation;

const tocValidation = optionalStringValidation;

const coverUrlValidation = optionalUrlValidation;

const coverCaptionValidation = optionalStringValidation;

const firstPageValidation = optionalStringValidation;

const lastPageValidation = optionalStringValidation;

const pageIntervalValidation = optionalStringValidation;

const updatedAtWithRelationsValidation = timestampValidation;
