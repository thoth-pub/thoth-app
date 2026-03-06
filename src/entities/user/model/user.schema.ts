import { graphql } from '@/gql';

export const GET_USER = graphql(`
  query GetUser {
    me {
      userId
      email
      firstName
      lastName
      isSuperuser
      publisherContexts {
        publisher {
          publisherName
          publisherId
          imprints {
            imprintId
            imprintName
            imprintUrl
            updatedAt
            crossmarkDoi
            defaultCurrency
            defaultLocale
            defaultPlace
          }
        }
        permissions {
          publisherAdmin
          workLifecycle
          cdnWrite
        }
      }
    }
  }
`);
