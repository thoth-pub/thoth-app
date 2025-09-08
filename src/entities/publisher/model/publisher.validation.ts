import {
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
} from '@/src/shared/utils/validations';

const publisherName = getRequiredStringValidation();

const publisherShortName = optionalStringValidation;

const publisherUrl = optionalUrlValidation;
