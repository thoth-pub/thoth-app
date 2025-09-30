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
    "\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": typeof types.CreateAffiliationDocument,
    "\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": typeof types.UpdateAffiliationDocument,
    "\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n": typeof types.DeleteAffiliationDocument,
    "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n    }\n  }\n": typeof types.GetContributorsDocument,
    "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetLinkedPublishersDocument,
    "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.CreateContributorDocument,
    "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.UpdateContributorDocument,
    "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.GetContributorDocument,
    "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n": typeof types.GetImprintsCountDocument,
    "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n": typeof types.GetImprintsDocument,
    "\n  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {\n    institutions(offset: $offset, limit: $limit, filter: $filter) {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n": typeof types.GetInstitutionsDocument,
    "\n  query GetInstitutionsCount($filter: String) {\n    institutionCount(filter: $filter)\n  }\n": typeof types.GetInstitutionsCountDocument,
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetPublicationsDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n": typeof types.GetPublishersDocument,
    "\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n": typeof types.GetSeriesDocument,
    "\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n": typeof types.CreateWorkDocument,
    "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n    }\n  }\n": typeof types.CreateContributionDocument,
    "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n": typeof types.DeleteContributionDocument,
    "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n": typeof types.UpdateContributionDocument,
    "\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetBooksDocument,
    "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetChaptersDocument,
    "\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetWorksDocument,
    "\n  query GetWork($workId: Uuid!) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetWorkDocument,
    "\n  mutation UpdateWork($data: PatchWork!) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": typeof types.UpdateWorkDocument,
    "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n": typeof types.DeleteWorkDocument,
    "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    affiliationOrdinal\n    position\n  }\n": typeof types.AffiliationFragmentFragmentDoc,
    "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n": typeof types.ContributorFragmentFragmentDoc,
    "\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    contributions {\n      fullName\n    }\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n  }\n": typeof types.WorkFragmentFragmentDoc,
};
const documents: Documents = {
    "\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": types.CreateAffiliationDocument,
    "\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": types.UpdateAffiliationDocument,
    "\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n": types.DeleteAffiliationDocument,
    "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n    }\n  }\n": types.GetContributorsDocument,
    "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n": types.GetLinkedPublishersDocument,
    "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": types.CreateContributorDocument,
    "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": types.UpdateContributorDocument,
    "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n": types.GetContributorDocument,
    "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n": types.GetImprintsCountDocument,
    "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n": types.GetImprintsDocument,
    "\n  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {\n    institutions(offset: $offset, limit: $limit, filter: $filter) {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n": types.GetInstitutionsDocument,
    "\n  query GetInstitutionsCount($filter: String) {\n    institutionCount(filter: $filter)\n  }\n": types.GetInstitutionsCountDocument,
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n": types.GetPublicationsDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n": types.GetPublishersDocument,
    "\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n": types.GetSeriesDocument,
    "\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n": types.CreateWorkDocument,
    "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n    }\n  }\n": types.CreateContributionDocument,
    "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n": types.DeleteContributionDocument,
    "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n": types.UpdateContributionDocument,
    "\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n": types.GetBooksDocument,
    "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n": types.GetChaptersDocument,
    "\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      ...WorkFragment\n    }\n  }\n": types.GetWorksDocument,
    "\n  query GetWork($workId: Uuid!) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n": types.GetWorkDocument,
    "\n  mutation UpdateWork($data: PatchWork!) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": types.UpdateWorkDocument,
    "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n": types.DeleteWorkDocument,
    "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    affiliationOrdinal\n    position\n  }\n": types.AffiliationFragmentFragmentDoc,
    "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n": types.ContributorFragmentFragmentDoc,
    "\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    contributions {\n      fullName\n    }\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n  }\n": types.WorkFragmentFragmentDoc,
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
export function graphql(source: "\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n    }\n  }\n"): (typeof documents)["\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n"): (typeof documents)["\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n"): (typeof documents)["\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {\n    institutions(offset: $offset, limit: $limit, filter: $filter) {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {\n    institutions(offset: $offset, limit: $limit, filter: $filter) {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetInstitutionsCount($filter: String) {\n    institutionCount(filter: $filter)\n  }\n"): (typeof documents)["\n  query GetInstitutionsCount($filter: String) {\n    institutionCount(filter: $filter)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetSeries($publishers: [Uuid!]!) {\n    serieses(publishers: $publishers) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetBooks($publishers: [Uuid!]!) {\n    books(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      contributions {\n        fullName\n      }\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetWorks($publishers: [Uuid!]!) {\n    works(publishers: $publishers) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWork($workId: Uuid!) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetWork($workId: Uuid!) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWork($data: PatchWork!) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateWork($data: PatchWork!) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    affiliationOrdinal\n    position\n  }\n"): (typeof documents)["\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    affiliationOrdinal\n    position\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n"): (typeof documents)["\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    contributions {\n      fullName\n    }\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    contributions {\n      fullName\n    }\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;