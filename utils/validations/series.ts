import { optionalStringValidation, optionalUrlValidation, requiredStingValidation } from './core';

const seriesNameValidation = requiredStingValidation;

const seriesUrl = optionalUrlValidation;

const seriesDescriptionValidation = optionalStringValidation;

const seriesCfpUrl = optionalUrlValidation;
