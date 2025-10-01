import { graphql } from '@/gql';

export const CREATE_LANGUAGE = graphql(`
  mutation CreateLanguage($data: NewLanguage!) {
    createLanguage(data: $data) {
      ...LanguageFragment
    }
  }
`);

export const UPDATE_LANGUAGE = graphql(`
  mutation UpdateLanguage($data: PatchLanguage!) {
    updateLanguage(data: $data) {
      ...LanguageFragment
    }
  }
`);

export const DELETE_LANGUAGE = graphql(`
  mutation DeleteLanguage($languageId: Uuid!) {
    deleteLanguage(languageId: $languageId) {
      languageId
    }
  }
`);
