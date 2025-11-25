import { ContributorTypes, WorkStatuses } from '../..';

export const getWorkStatusFromXml = (xmlStatus: string) => {
  switch (xmlStatus) {
    case '01':
      return WorkStatuses.enum.Cancelled;
    case '02':
      return WorkStatuses.enum.Forthcoming;
    case '04':
      return WorkStatuses.enum.Active;
    case '16':
      return WorkStatuses.enum.Withdrawn;
    case '21':
      return WorkStatuses.enum.Superseded;
    default:
      return WorkStatuses.enum.Forthcoming;
  }
};

export const getContributorRoleFromXml = (role: string) => {
  switch (role) {
    case 'A19':
      return ContributorTypes.enum.AfterwordBy;
    case 'A01':
      return ContributorTypes.enum.Author;
    case 'A32':
      return ContributorTypes.enum.ContributionsBy;
    case 'B01':
      return ContributorTypes.enum.Editor;
    case 'A23':
      return ContributorTypes.enum.ForewordBy;
    case 'A12':
      return ContributorTypes.enum.Illustrator;
    case 'A34':
      return ContributorTypes.enum.Indexer;
    case 'A24':
      return ContributorTypes.enum.IntroductionBy;
    case 'A06':
      return ContributorTypes.enum.MusicEditor;
    case 'A08':
      return ContributorTypes.enum.Photographer;
    case 'A15':
      return ContributorTypes.enum.PrefaceBy;
    case 'A51':
      return ContributorTypes.enum.ResearchBy;
    case 'A30':
      return ContributorTypes.enum.SoftwareBy;
    case 'A32':
      return ContributorTypes.enum.Translator;
    default:
      return ContributorTypes.enum.Author;
  }
};
