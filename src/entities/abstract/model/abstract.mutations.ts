import { graphql } from '@/gql';

export const CREATE_ABSTRACT = graphql(`
  mutation CreateAbstract($data: NewAbstract!, $markupFormat: MarkupFormat = JATS_XML) {
    createAbstract(data: $data, markupFormat: $markupFormat) {
      ...AbstractFragment
    }
  }
`);

export const UPDATE_ABSTRACT = graphql(`
  mutation UpdateAbstract($data: PatchAbstract!, $markupFormat: MarkupFormat = JATS_XML) {
    updateAbstract(data: $data, markupFormat: $markupFormat) {
      ...AbstractFragment
    }
  }
`);

export const DELETE_ABSTRACT = graphql(`
  mutation DeleteAbstract($abstractId: Uuid!) {
    deleteAbstract(abstractId: $abstractId) {
      abstractId
    }
  }
`);
