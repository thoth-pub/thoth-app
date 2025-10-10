import { z } from 'zod';

import { LOCALES } from '@/src/shared/constants';

import { getContributorTypeOptions, getLanguageRelationOptions, getWorkTypeOptions } from '../../utils';

export type Locale = z.infer<typeof LOCALES>;

const workTypesLabels = z.enum(getWorkTypeOptions(LOCALES.enum.en).map((option) => option.label.toLowerCase()));
const contributorTypesLabels = z.enum(
  getContributorTypeOptions(LOCALES.enum.en).map((option) => option.label.toLowerCase()),
);
const languageRelationLabels = z.enum(
  getLanguageRelationOptions(LOCALES.enum.en).map((option) => option.label.toLowerCase()),
);

export const RESOURCES = z.enum([
  'basic details',
  'add',
  'add new price',
  'add new affiliation',
  'add new language',
  'add new location',
  'add translation',
  'add contributor',
  'add publication',
  ...workTypesLabels.options,
  ...contributorTypesLabels.options,
  ...languageRelationLabels.options,
]);
