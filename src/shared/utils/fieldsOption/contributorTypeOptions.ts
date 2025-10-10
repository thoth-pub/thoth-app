import { ContributorTypes, LOCALES } from '../../constants';

const contributorTypeOptions = [
  { value: ContributorTypes.enum.AfterwordBy, label: 'afterword by' },
  { value: ContributorTypes.enum.Author, label: 'author' },
  { value: ContributorTypes.enum.ContributionsBy, label: 'contributions by' },
  { value: ContributorTypes.enum.Editor, label: 'editor' },
  { value: ContributorTypes.enum.ForewordBy, label: 'foreword by' },
  { value: ContributorTypes.enum.Illustrator, label: 'illustrator' },
  { value: ContributorTypes.enum.Indexer, label: 'indexer' },
  { value: ContributorTypes.enum.IntroductionBy, label: 'introduction by' },
  { value: ContributorTypes.enum.MusicEditor, label: 'music editor' },
  { value: ContributorTypes.enum.Photographer, label: 'photographer' },
  { value: ContributorTypes.enum.PrefaceBy, label: 'preface by' },
  { value: ContributorTypes.enum.ResearchBy, label: 'research by' },
  { value: ContributorTypes.enum.SoftwareBy, label: 'software by' },
  { value: ContributorTypes.enum.Translator, label: 'translator' },
];

const contributorTypeOptionsEs = [
  { value: ContributorTypes.enum.AfterwordBy, label: 'epílogo de' },
  { value: ContributorTypes.enum.Author, label: 'autor' },
  { value: ContributorTypes.enum.ContributionsBy, label: 'contribuciones de' },
  { value: ContributorTypes.enum.Editor, label: 'editor' },
  { value: ContributorTypes.enum.ForewordBy, label: 'prólogo de' },
  { value: ContributorTypes.enum.Illustrator, label: 'ilustrador' },
  { value: ContributorTypes.enum.Indexer, label: 'indexador' },
  { value: ContributorTypes.enum.IntroductionBy, label: 'introducción por' },
  { value: ContributorTypes.enum.MusicEditor, label: 'editor de música' },
  { value: ContributorTypes.enum.Photographer, label: 'fotógrafo' },
  { value: ContributorTypes.enum.PrefaceBy, label: 'prefacio de' },
  { value: ContributorTypes.enum.ResearchBy, label: 'investigación realizada por' },
  { value: ContributorTypes.enum.SoftwareBy, label: 'software de' },
  { value: ContributorTypes.enum.Translator, label: 'traductor' },
];

export const getContributorTypeOptions = (locale: string) => {
  const options = {
    [LOCALES.enum.en]: contributorTypeOptions,
    [LOCALES.enum.es]: contributorTypeOptionsEs,
  };

  const selectedOptions = options[locale as keyof typeof options];

  return selectedOptions ?? options[LOCALES.enum.en];
};
