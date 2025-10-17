import { LOCALES, WorkTypes } from '../../constants';

const workTypeOptions = [
  { value: WorkTypes.enum.EditedBook, label: 'edited book' },
  { value: WorkTypes.enum.JournalIssue, label: 'journal issue' },
  { value: WorkTypes.enum.Monograph, label: 'monograph' },
  { value: WorkTypes.enum.Textbook, label: 'textbook' },
];

const workTypeOptionsEs = [
  { value: WorkTypes.enum.EditedBook, label: 'libro editado' },
  { value: WorkTypes.enum.JournalIssue, label: 'número de la revista' },
  { value: WorkTypes.enum.Monograph, label: 'monografía' },
  { value: WorkTypes.enum.Textbook, label: 'texto escolar' },
];

export const getWorkTypeOptions = (locale: string) => {
  const options = {
    [LOCALES.enum.en]: workTypeOptions,
    [LOCALES.enum.es]: workTypeOptionsEs,
  };

  const selectedOptions = options[locale as keyof typeof options];

  return selectedOptions ?? options[LOCALES.enum.en];
};
