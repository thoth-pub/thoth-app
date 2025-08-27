/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": typeof types.GetBooksDocument,
    "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": typeof types.GetChaptersDocument,
    "\n  query GetContributors {\n    contributors {\n      orcid\n      fullName\n      updatedAt\n      contributorId\n    }\n  }\n": typeof types.GetContributorsDocument,
    "\n  query GetImprints($publishers: [Uuid!]!) {\n    imprints(publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n": typeof types.GetImprintsDocument,
    "\n  query GetInstitutions {\n    institutions {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n": typeof types.GetInstitutionsDocument,
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetPublicationsDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!) {\n    publishers(publishers: $publishers) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n": typeof types.GetPublishersDocument,
    "\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n": typeof types.GetSeriesDocument,
    "\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": typeof types.GetWorksDocument,
};
const documents: Documents = {
    "\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": types.GetBooksDocument,
    "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": types.GetChaptersDocument,
    "\n  query GetContributors {\n    contributors {\n      orcid\n      fullName\n      updatedAt\n      contributorId\n    }\n  }\n": types.GetContributorsDocument,
    "\n  query GetImprints($publishers: [Uuid!]!) {\n    imprints(publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n": types.GetImprintsDocument,
    "\n  query GetInstitutions {\n    institutions {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n": types.GetInstitutionsDocument,
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n": types.GetPublicationsDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!) {\n    publishers(publishers: $publishers) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n": types.GetPublishersDocument,
    "\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n": types.GetSeriesDocument,
    "\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": types.GetWorksDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetContributors {\n    contributors {\n      orcid\n      fullName\n      updatedAt\n      contributorId\n    }\n  }\n"): (typeof documents)["\n  query GetContributors {\n    contributors {\n      orcid\n      fullName\n      updatedAt\n      contributorId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetImprints($publishers: [Uuid!]!) {\n    imprints(publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetImprints($publishers: [Uuid!]!) {\n    imprints(publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInstitutions {\n    institutions {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetInstitutions {\n    institutions {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublishers($publishers: [Uuid!]!) {\n    publishers(publishers: $publishers) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetPublishers($publishers: [Uuid!]!) {\n    publishers(publishers: $publishers) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      doi\n      workId\n      title\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;