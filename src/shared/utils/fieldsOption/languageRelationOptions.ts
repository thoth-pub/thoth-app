import { LanguageRelation, LOCALES } from '../../constants';

const languageRelationOptions = [
  { value: LanguageRelation.enum.Original, label: 'original' },
  { value: LanguageRelation.enum.TranslatedFrom, label: 'translated from' },
  { value: LanguageRelation.enum.TranslatedInto, label: 'translated to' },
];

const languageRelationOptionsEs = [
  { value: LanguageRelation.enum.Original, label: 'original' },
  { value: LanguageRelation.enum.TranslatedFrom, label: 'traducido de' },
  { value: LanguageRelation.enum.TranslatedInto, label: 'traducido a' },
];

export const getLanguageRelationOptions = (locale: string) => {
  const options = {
    [LOCALES.enum.en]: languageRelationOptions,
    [LOCALES.enum.es]: languageRelationOptionsEs,
  };

  const selectedOptions = options[locale as keyof typeof options];

  return selectedOptions ?? options[LOCALES.enum.en];
};
