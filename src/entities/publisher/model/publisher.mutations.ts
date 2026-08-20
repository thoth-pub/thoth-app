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

export const CREATE_PUBLISHER = graphql(`
  mutation CreatePublisher($data: NewPublisher!) {
    createPublisher(data: $data) {
      publisherId
    }
  }
`);

// APP-01B: complete replace of a publisher's desired service configuration, not a
// patch. `expectedUpdatedAt` is the version token read for the edit session, and
// the response is the server-normalized configuration that becomes the new client
// truth (including its fresh `updatedAt`).
export const REPLACE_PUBLISHER_SERVICE_CONFIGURATION = graphql(`
  mutation ReplacePublisherServiceConfiguration($data: ReplacePublisherServiceConfigurationInput!) {
    replacePublisherServiceConfiguration(data: $data) {
      subscriptionPackage
      effectiveCapabilities
      enabledDistributionPlatforms {
        platform
      }
      updatedAt
    }
  }
`);
