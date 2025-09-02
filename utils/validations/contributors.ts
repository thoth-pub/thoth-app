import { getRequiredStringValidation, optionalStringValidation, optionalUrlValidation } from './core';

const firstNameValidation = optionalStringValidation;

const lastNameValidation = getRequiredStringValidation();

const fullNameValidation = optionalStringValidation;

const websiteUrlValidation = optionalUrlValidation;
