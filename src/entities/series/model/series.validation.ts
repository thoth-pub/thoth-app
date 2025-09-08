import {
  getRequiredStringValidation,
  optionalStringValidation,
  optionalUrlValidation,
} from '@/src/shared/utils/validations';

const seriesNameValidation = getRequiredStringValidation();

const seriesUrl = optionalUrlValidation;

const seriesDescriptionValidation = optionalStringValidation;

const seriesCfpUrl = optionalUrlValidation;
