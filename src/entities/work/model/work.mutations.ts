import { graphql } from '@/gql';

export const CREATE_WORK = graphql(`
  mutation CreateWork($data: NewWork!) {
    createWork(data: $data) {
      ...WorkFragment
    }
  }
`);

export const MOVE_WORK_RELATION = graphql(`
  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {
    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {
      workRelationId
    }
  }
`);

export const CREATE_TITLE = graphql(`
  mutation CreateTitle($data: NewTitle!, $markupFormat: MarkupFormat = PLAIN_TEXT) {
    createTitle(data: $data, markupFormat: $markupFormat) {
      ...TitleFragment
    }
  }
`);

export const UPDATE_TITLE = graphql(`
  mutation UpdateTitle($data: PatchTitle!, $markupFormat: MarkupFormat = PLAIN_TEXT) {
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

export const CREATE_ABSTRACT = graphql(`
  mutation CreateAbstract($data: NewAbstract!) {
    createAbstract(data: $data) {
      ...AbstractFragment
    }
  }
`);

export const UPDATE_ABSTRACT = graphql(`
  mutation UpdateAbstract($data: PatchAbstract!) {
    updateAbstract(data: $data) {
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
