import { LanguageRelation } from "../../constants/languages";


export const languageRelationOptions = [
  { value: LanguageRelation.enum.Original, label: 'original' },
  { value: LanguageRelation.enum.TranslatedFrom, label: 'translated from' },
  { value: LanguageRelation.enum.TranslatedInto, label: 'translated to' },
];
