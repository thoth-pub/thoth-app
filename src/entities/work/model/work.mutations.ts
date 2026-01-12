import { graphql } from '@/gql';

export const CREATE_WORK = graphql(`
  mutation CreateWork($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {
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
