import { graphql } from '@/gql';

export const CREATE_CONTACT = graphql(`
  mutation CreateContact($data: NewContact!) {
    createContact(data: $data) {
      contactId
      contactType
      email
    }
  }
`);

export const UPDATE_CONTACT = graphql(`
  mutation UpdateContact($data: PatchContact!) {
    updateContact(data: $data) {
      contactId
      contactType
      email
    }
  }
`);

export const DELETE_CONTACT = graphql(`
  mutation DeleteContact($contactId: Uuid!) {
    deleteContact(contactId: $contactId) {
      contactId
    }
  }
`);
