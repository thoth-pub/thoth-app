import {
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
} from '@/src/shared/utils/validations';

const firstNameValidation = optionalStringValidation;

const lastNameValidation = getRequiredStringValidation();

const fullNameValidation = optionalStringValidation;

const websiteUrlValidation = optionalUrlValidation;
