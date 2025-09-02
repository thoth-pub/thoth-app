import { getRequiredStringValidation, optionalStringValidation, optionalUrlValidation } from './core';

const seriesNameValidation = getRequiredStringValidation();

const seriesUrl = optionalUrlValidation;

const seriesDescriptionValidation = optionalStringValidation;

const seriesCfpUrl = optionalUrlValidation;
