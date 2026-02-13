import { ContributorTypes } from '../../constants';
import { FormFieldOption } from '../../interfaces';

export const contributorTypeOptions = [
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

export const convertContributorTypeOptions = (options: FormFieldOption[]) => {
  return options.map((option) => ({
    ...option,
    label: option.label
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replaceAll('By', 'by'),
  }));
};
