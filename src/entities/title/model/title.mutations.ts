import { graphql } from '@/gql';

export const CREATE_TITLE = graphql(`
  mutation CreateTitle($data: NewTitle!, $markupFormat: MarkupFormat = JATS_XML) {
    createTitle(data: $data, markupFormat: $markupFormat) {
      ...TitleFragment
    }
  }
`);

export const UPDATE_TITLE = graphql(`
  mutation UpdateTitle($data: PatchTitle!, $markupFormat: MarkupFormat = JATS_XML) {
    updateTitle(data: $data, markupFormat: $markupFormat) {
      ...TitleFragment
    }
  }
`);

export const DELETE_TITLE = graphql(`
  mutation DeleteTitle($titleId: Uuid!) {
    deleteTitle(titleId: $titleId) {
      titleId
    }
  }
`);
