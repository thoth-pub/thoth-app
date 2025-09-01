import { optionalStringValidation, optionalUrlValidation, requiredStingValidation } from './core';

const publisherName = requiredStingValidation;

const publisherShortName = optionalStringValidation;

const publisherUrl = optionalUrlValidation;
