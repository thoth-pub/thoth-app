import type { FieldSchema, ValidatorConfig } from 'csv-file-validator';
import isbn3 from 'isbn3';
import z from 'zod';

import { LocationPlatform } from '@/gql/graphql';
import {
  editionValidation,
  subtitleValidation,
  titleValidation,
  workTypeValidation,
} from '@/src/entities/work/model/work.validation';
import { ContributorTypes, currencyOptions, languageOptions, WorkStatuses, WorkTypes } from '@/src/shared/constants';

import { FormFieldOption } from '../../interfaces';
import { workStatusValidation } from '../../utils';
import type { TranslateFunction } from './CSVParser';
import { csvSchema, type CsvValidationRule, type CsvValidatorCell } from './csvSchema';

type ValidationContext = {
  imprintLabels: string[];
  licenseOptions: FormFieldOption[];
  t: TranslateFunction;
};

const optionalValue = (field: CsvValidatorCell, validate: (value: string) => boolean) => {
  const value = `${field}`.trim();

  return value.length === 0 || validate(value);
};

const validationFor = (
  rule: CsvValidationRule,
  context: ValidationContext,
): Pick<FieldSchema, 'validate' | 'validateError'> => {
  const { imprintLabels, licenseOptions, t } = context;
  const invalid = (headerName: string, rowNumber: number, columnNumber: number) =>
    t('errors.csvFieldNotValid', { field: headerName, row: rowNumber, column: columnNumber });
  const invalidOptions = (options: string) => (headerName: string, rowNumber: number, columnNumber: number) =>
    t('errors.csvFieldNotValidOptions', { field: headerName, row: rowNumber, column: columnNumber, options });

  switch (rule) {
    case 'imprint':
      return {
        validate: (field) => imprintLabels.includes(`${field}`),
        validateError: invalidOptions(imprintLabels.join(', ')),
      };
    case 'workType':
      return {
        validate: (field) => workTypeValidation.safeParse(`${field}`).success,
        validateError: invalidOptions(WorkTypes.options.join(', ')),
      };
    case 'workStatus':
      return {
        validate: (field) => workStatusValidation.safeParse(`${field}`).success,
        validateError: invalidOptions(WorkStatuses.options.join(', ')),
      };
    case 'title':
      return { validate: (field) => titleValidation.safeParse(`${field}`).success, validateError: invalid };
    case 'subtitle':
      return { validate: (field) => subtitleValidation.safeParse(`${field}`).success, validateError: invalid };
    case 'edition':
      return { validate: (field) => editionValidation.safeParse(`${field}`).success, validateError: invalid };
    case 'license':
      return {
        validate: (field) => optionalValue(field, (value) => licenseOptions.some((option) => option.value === value)),
        validateError: invalid,
      };
    case 'contributorRole':
      return {
        validate: (field) => optionalValue(field, (value) => ContributorTypes.safeParse(value).success),
        validateError: invalidOptions(ContributorTypes.options.join(', ')),
      };
    case 'language':
      return {
        validate: (field) => optionalValue(field, (value) => languageOptions.some((option) => option.value === value)),
        validateError: invalidOptions(languageOptions.map((option) => option.value).join(', ')),
      };
    case 'isbn':
      return { validate: (field) => optionalValue(field, (value) => isbn3.parse(value)?.isValid ?? false) };
    case 'currency':
      return {
        validate: (field) => optionalValue(field, (value) => currencyOptions.some((option) => option.value === value)),
        validateError: invalidOptions(currencyOptions.map((option) => option.value).join(', ')),
      };
    case 'locationPlatform':
      return {
        validate: (field) => optionalValue(field, (value) => z.enum(LocationPlatform).safeParse(value).success),
      };
  }
};

/** Adapts the application-owned CSV contract to csv-file-validator's third-party shape. */
export const getCsvConfig = (
  imprints: FormFieldOption[],
  licenseOptions: FormFieldOption[],
  t: TranslateFunction,
): ValidatorConfig => {
  const context: ValidationContext = { imprintLabels: imprints.map(({ label }) => label), licenseOptions, t };

  return {
    headers: csvSchema.map(({ header, key, required, optionalColumn, validation }) => ({
      name: header,
      inputName: key,
      required,
      ...(optionalColumn ? { optional: true } : {}),
      ...(header === 'imprint'
        ? {
            requiredError: (headerName: string, rowNumber: number, columnNumber: number) =>
              t('errors.csvFieldRequired', { field: headerName, row: rowNumber, column: columnNumber }),
          }
        : {}),
      ...(validation ? validationFor(validation, context) : {}),
    })),
  };
};
