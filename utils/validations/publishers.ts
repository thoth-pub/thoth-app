import { getRequiredStringValidation, optionalStringValidation, optionalUrlValidation } from './core';

const publisherName = getRequiredStringValidation();

const publisherShortName = optionalStringValidation;

const publisherUrl = optionalUrlValidation;
