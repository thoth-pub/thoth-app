import { optionalStringValidation, optionalUrlValidation, requiredStingValidation } from './core';

const firstNameValidation = optionalStringValidation;

const lastNameValidation = requiredStingValidation;

const fullNameValidation = optionalStringValidation;

const websiteUrlValidation = optionalUrlValidation;
