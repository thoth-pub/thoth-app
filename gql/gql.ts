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
    "\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetBooksDocument,
    "\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    )\n  }\n": typeof types.GetBooksCountDocument,
    "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n    }\n  }\n": typeof types.GetContributorsDocument,
    "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetLinkedPublishersDocument,
    "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.CreateContributorDocument,
    "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.UpdateContributorDocument,
    "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.GetContributorDocument,
    "\n  mutation CreateFunding($data: NewFunding!) {\n    createFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": typeof types.CreateFundingDocument,
    "\n  mutation UpdateFunding($data: PatchFunding!) {\n    updateFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": typeof types.UpdateFundingDocument,
    "\n  mutation DeleteFunding($fundingId: Uuid!) {\n    deleteFunding(fundingId: $fundingId) {\n      ...FundingFragment\n    }\n  }\n": typeof types.DeleteFundingDocument,
    "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n": typeof types.GetImprintsCountDocument,
    "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n": typeof types.GetImprintsDocument,
    "\n  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {\n    institutions(offset: $offset, limit: $limit, filter: $filter) {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n": typeof types.GetInstitutionsDocument,
    "\n  query GetInstitutionsCount($filter: String) {\n    institutionCount(filter: $filter)\n  }\n": typeof types.GetInstitutionsCountDocument,
    "\n  mutation CreateLanguage($data: NewLanguage!) {\n    createLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n": typeof types.CreateLanguageDocument,
    "\n  mutation UpdateLanguage($data: PatchLanguage!) {\n    updateLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n": typeof types.UpdateLanguageDocument,
    "\n  mutation DeleteLanguage($languageId: Uuid!) {\n    deleteLanguage(languageId: $languageId) {\n      languageId\n    }\n  }\n": typeof types.DeleteLanguageDocument,
    "\n  mutation CreateLocation($data: NewLocation!) {\n    createLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n": typeof types.CreateLocationDocument,
    "\n  mutation UpdateLocation($data: PatchLocation!) {\n    updateLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n": typeof types.UpdateLocationDocument,
    "\n  mutation DeleteLocation($locationId: Uuid!) {\n    deleteLocation(locationId: $locationId) {\n      locationId\n    }\n  }\n": typeof types.DeleteLocationDocument,
    "\n  mutation CreatePrice($data: NewPrice!) {\n    createPrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n": typeof types.CreatePriceDocument,
    "\n  mutation DeletePrice($priceId: Uuid!) {\n    deletePrice(priceId: $priceId) {\n      priceId\n    }\n  }\n": typeof types.DeletePriceDocument,
    "\n  mutation UpdatePrice($data: PatchPrice!) {\n    updatePrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n": typeof types.UpdatePriceDocument,
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n": typeof types.GetPublicationsDocument,
    "\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n": typeof types.CreatePublicationDocument,
    "\n  mutation UpdatePublication($data: PatchPublication!) {\n    updatePublication(data: $data) {\n      publicationId\n    }\n  }\n": typeof types.UpdatePublicationDocument,
    "\n  mutation DeletePublication($publicationId: Uuid!) {\n    deletePublication(publicationId: $publicationId) {\n      publicationId\n    }\n  }\n": typeof types.DeletePublicationDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n": typeof types.GetPublishersDocument,
    "\n  mutation CreateReference($data: NewReference!) {\n    createReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.CreateReferenceDocument,
    "\n  mutation UpdateReference($data: PatchReference!) {\n    updateReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.UpdateReferenceDocument,
    "\n  mutation DeleteReference($referenceId: Uuid!) {\n    deleteReference(referenceId: $referenceId) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.DeleteReferenceDocument,
    "\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n": typeof types.GetSeriesesDocument,
    "\n  query GetSeriesCount($publishers: [Uuid!]!) {\n    seriesCount(publishers: $publishers)\n  }\n": typeof types.GetSeriesCountDocument,
    "\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n": typeof types.GetSeriesDocument,
    "\n  mutation CreateSeries($data: NewSeries!) {\n    createSeries(data: $data) {\n      seriesId\n    }\n  }\n": typeof types.CreateSeriesDocument,
    "\n  mutation UpdateSeries($data: PatchSeries!) {\n    updateSeries(data: $data) {\n      seriesId\n    }\n  }\n": typeof types.UpdateSeriesDocument,
    "\n  mutation DeleteSeries($seriesId: Uuid!) {\n    deleteSeries(seriesId: $seriesId) {\n      seriesId\n    }\n  }\n": typeof types.DeleteSeriesDocument,
    "\n  mutation CreateIssue($data: NewIssue!) {\n    createIssue(data: $data) {\n      issueId\n    }\n  }\n": typeof types.CreateIssueDocument,
    "\n  mutation UpdateIssue($data: PatchIssue!) {\n    updateIssue(data: $data) {\n      issueId\n      issueOrdinal\n      seriesId\n      workId\n    }\n  }\n": typeof types.UpdateIssueDocument,
    "\n  mutation DeleteIssue($issueId: Uuid!) {\n    deleteIssue(issueId: $issueId) {\n      issueId\n    }\n  }\n": typeof types.DeleteIssueDocument,
    "\n  mutation CreateSubject($data: NewSubject!) {\n    createSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": typeof types.CreateSubjectDocument,
    "\n  mutation UpdateSubject($data: PatchSubject!) {\n    updateSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": typeof types.UpdateSubjectDocument,
    "\n  mutation DeleteSubject($subjectId: Uuid!) {\n    deleteSubject(subjectId: $subjectId) {\n      ...SubjectFragment\n    }\n  }\n": typeof types.DeleteSubjectDocument,
    "\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n": typeof types.CreateWorkDocument,
    "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n      contributionId\n    }\n  }\n": typeof types.CreateContributionDocument,
    "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n": typeof types.DeleteContributionDocument,
    "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n": typeof types.UpdateContributionDocument,
    "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      publicationDate\n      withdrawnDate\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      reference\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n      languages {\n        languageId\n        languageCode\n        languageRelation\n        mainLanguage\n      }\n      fundings {\n        fundingId\n        grantNumber\n        institutionId\n        jurisdiction\n        program\n        projectName\n        projectShortname\n        institution {\n          institutionName\n          ror\n        }\n      }\n      publications {\n        publicationId\n        isbn\n        publicationType\n        updatedAt\n        weightG: weight(units: G)\n        weightOz: weight(units: OZ)\n        widthMm: width(units: MM)\n        widthIn: width(units: IN)\n        heightMm: height(units: MM)\n        heightIn: height(units: IN)\n        depthMm: depth(units: MM)\n        depthIn: depth(units: IN)\n        work {\n          doi\n          title\n          imprint {\n            publisher {\n              publisherName\n            }\n          }\n        }\n        prices {\n          unitPrice\n          priceId\n          currencyCode\n        }\n        locations {\n          canonical\n          fullTextUrl\n          landingPage\n          locationPlatform\n          locationId\n        }\n      }\n      references {\n        doi\n        referenceId\n        referenceOrdinal\n        unstructuredCitation\n        journalTitle\n        articleTitle\n        seriesTitle\n        volumeTitle\n        url\n      }\n      subjects {\n        subjectId\n        subjectCode\n        subjectType\n        subjectOrdinal\n      }\n    }\n  }\n": typeof types.GetChaptersDocument,
    "\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetWorksDocument,
    "\n  query GetWork($workId: Uuid!) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetWorkDocument,
    "\n  mutation UpdateWork($data: PatchWork!) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": typeof types.UpdateWorkDocument,
    "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n": typeof types.DeleteWorkDocument,
    "\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n": typeof types.GetWorksCountDocument,
    "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n": typeof types.AffiliationFragmentFragmentDoc,
    "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n": typeof types.ContributorFragmentFragmentDoc,
    "\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    jurisdiction\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n": typeof types.FundingFragmentFragmentDoc,
    "\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n    mainLanguage\n  }\n": typeof types.LanguageFragmentFragmentDoc,
    "\n  fragment LocationFragment on Location {\n    canonical\n    fullTextUrl\n    landingPage\n    locationPlatform\n    locationId\n  }\n": typeof types.LocationFragmentFragmentDoc,
    "\n  fragment PriceFragment on Price {\n    unitPrice\n    priceId\n    currencyCode\n  }\n": typeof types.PriceFragmentFragmentDoc,
    "\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": typeof types.PublicationFragmentFragmentDoc,
    "\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n": typeof types.ReferenceFragmentFragmentDoc,
    "\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n": typeof types.SubjectFragmentFragmentDoc,
    "\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    subtitle\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      mainLanguage\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      jurisdiction\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n  }\n": typeof types.WorkFragmentFragmentDoc,
};
const documents: Documents = {
    "\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": types.CreateAffiliationDocument,
    "\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": types.UpdateAffiliationDocument,
    "\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n": types.DeleteAffiliationDocument,
    "\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n": types.GetBooksDocument,
    "\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    )\n  }\n": types.GetBooksCountDocument,
    "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n    }\n  }\n": types.GetContributorsDocument,
    "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n": types.GetLinkedPublishersDocument,
    "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": types.CreateContributorDocument,
    "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": types.UpdateContributorDocument,
    "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n": types.GetContributorDocument,
    "\n  mutation CreateFunding($data: NewFunding!) {\n    createFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": types.CreateFundingDocument,
    "\n  mutation UpdateFunding($data: PatchFunding!) {\n    updateFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": types.UpdateFundingDocument,
    "\n  mutation DeleteFunding($fundingId: Uuid!) {\n    deleteFunding(fundingId: $fundingId) {\n      ...FundingFragment\n    }\n  }\n": types.DeleteFundingDocument,
    "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n": types.GetImprintsCountDocument,
    "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      publisher {\n        publisherName\n      }\n    }\n  }\n": types.GetImprintsDocument,
    "\n  query GetInstitutions($offset: Int!, $limit: Int, $filter: String) {\n    institutions(offset: $offset, limit: $limit, filter: $filter) {\n      institutionId\n      institutionName\n      institutionDoi\n      ror\n      countryCode\n      updatedAt\n    }\n  }\n": types.GetInstitutionsDocument,
    "\n  query GetInstitutionsCount($filter: String) {\n    institutionCount(filter: $filter)\n  }\n": types.GetInstitutionsCountDocument,
    "\n  mutation CreateLanguage($data: NewLanguage!) {\n    createLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n": types.CreateLanguageDocument,
    "\n  mutation UpdateLanguage($data: PatchLanguage!) {\n    updateLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n": types.UpdateLanguageDocument,
    "\n  mutation DeleteLanguage($languageId: Uuid!) {\n    deleteLanguage(languageId: $languageId) {\n      languageId\n    }\n  }\n": types.DeleteLanguageDocument,
    "\n  mutation CreateLocation($data: NewLocation!) {\n    createLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n": types.CreateLocationDocument,
    "\n  mutation UpdateLocation($data: PatchLocation!) {\n    updateLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n": types.UpdateLocationDocument,
    "\n  mutation DeleteLocation($locationId: Uuid!) {\n    deleteLocation(locationId: $locationId) {\n      locationId\n    }\n  }\n": types.DeleteLocationDocument,
    "\n  mutation CreatePrice($data: NewPrice!) {\n    createPrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n": types.CreatePriceDocument,
    "\n  mutation DeletePrice($priceId: Uuid!) {\n    deletePrice(priceId: $priceId) {\n      priceId\n    }\n  }\n": types.DeletePriceDocument,
    "\n  mutation UpdatePrice($data: PatchPrice!) {\n    updatePrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n": types.UpdatePriceDocument,
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n": types.GetPublicationsDocument,
    "\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n": types.CreatePublicationDocument,
    "\n  mutation UpdatePublication($data: PatchPublication!) {\n    updatePublication(data: $data) {\n      publicationId\n    }\n  }\n": types.UpdatePublicationDocument,
    "\n  mutation DeletePublication($publicationId: Uuid!) {\n    deletePublication(publicationId: $publicationId) {\n      publicationId\n    }\n  }\n": types.DeletePublicationDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n": types.GetPublishersDocument,
    "\n  mutation CreateReference($data: NewReference!) {\n    createReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": types.CreateReferenceDocument,
    "\n  mutation UpdateReference($data: PatchReference!) {\n    updateReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": types.UpdateReferenceDocument,
    "\n  mutation DeleteReference($referenceId: Uuid!) {\n    deleteReference(referenceId: $referenceId) {\n      ...ReferenceFragment\n    }\n  }\n": types.DeleteReferenceDocument,
    "\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n": types.GetSeriesesDocument,
    "\n  query GetSeriesCount($publishers: [Uuid!]!) {\n    seriesCount(publishers: $publishers)\n  }\n": types.GetSeriesCountDocument,
    "\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n": types.GetSeriesDocument,
    "\n  mutation CreateSeries($data: NewSeries!) {\n    createSeries(data: $data) {\n      seriesId\n    }\n  }\n": types.CreateSeriesDocument,
    "\n  mutation UpdateSeries($data: PatchSeries!) {\n    updateSeries(data: $data) {\n      seriesId\n    }\n  }\n": types.UpdateSeriesDocument,
    "\n  mutation DeleteSeries($seriesId: Uuid!) {\n    deleteSeries(seriesId: $seriesId) {\n      seriesId\n    }\n  }\n": types.DeleteSeriesDocument,
    "\n  mutation CreateIssue($data: NewIssue!) {\n    createIssue(data: $data) {\n      issueId\n    }\n  }\n": types.CreateIssueDocument,
    "\n  mutation UpdateIssue($data: PatchIssue!) {\n    updateIssue(data: $data) {\n      issueId\n      issueOrdinal\n      seriesId\n      workId\n    }\n  }\n": types.UpdateIssueDocument,
    "\n  mutation DeleteIssue($issueId: Uuid!) {\n    deleteIssue(issueId: $issueId) {\n      issueId\n    }\n  }\n": types.DeleteIssueDocument,
    "\n  mutation CreateSubject($data: NewSubject!) {\n    createSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": types.CreateSubjectDocument,
    "\n  mutation UpdateSubject($data: PatchSubject!) {\n    updateSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": types.UpdateSubjectDocument,
    "\n  mutation DeleteSubject($subjectId: Uuid!) {\n    deleteSubject(subjectId: $subjectId) {\n      ...SubjectFragment\n    }\n  }\n": types.DeleteSubjectDocument,
    "\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n": types.CreateWorkDocument,
    "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n      contributionId\n    }\n  }\n": types.CreateContributionDocument,
    "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n": types.DeleteContributionDocument,
    "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n": types.UpdateContributionDocument,
    "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      publicationDate\n      withdrawnDate\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      reference\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n      languages {\n        languageId\n        languageCode\n        languageRelation\n        mainLanguage\n      }\n      fundings {\n        fundingId\n        grantNumber\n        institutionId\n        jurisdiction\n        program\n        projectName\n        projectShortname\n        institution {\n          institutionName\n          ror\n        }\n      }\n      publications {\n        publicationId\n        isbn\n        publicationType\n        updatedAt\n        weightG: weight(units: G)\n        weightOz: weight(units: OZ)\n        widthMm: width(units: MM)\n        widthIn: width(units: IN)\n        heightMm: height(units: MM)\n        heightIn: height(units: IN)\n        depthMm: depth(units: MM)\n        depthIn: depth(units: IN)\n        work {\n          doi\n          title\n          imprint {\n            publisher {\n              publisherName\n            }\n          }\n        }\n        prices {\n          unitPrice\n          priceId\n          currencyCode\n        }\n        locations {\n          canonical\n          fullTextUrl\n          landingPage\n          locationPlatform\n          locationId\n        }\n      }\n      references {\n        doi\n        referenceId\n        referenceOrdinal\n        unstructuredCitation\n        journalTitle\n        articleTitle\n        seriesTitle\n        volumeTitle\n        url\n      }\n      subjects {\n        subjectId\n        subjectCode\n        subjectType\n        subjectOrdinal\n      }\n    }\n  }\n": types.GetChaptersDocument,
    "\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n": types.GetWorksDocument,
    "\n  query GetWork($workId: Uuid!) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n": types.GetWorkDocument,
    "\n  mutation UpdateWork($data: PatchWork!) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": types.UpdateWorkDocument,
    "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n": types.DeleteWorkDocument,
    "\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n": types.GetWorksCountDocument,
    "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n": types.AffiliationFragmentFragmentDoc,
    "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n": types.ContributorFragmentFragmentDoc,
    "\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    jurisdiction\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n": types.FundingFragmentFragmentDoc,
    "\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n    mainLanguage\n  }\n": types.LanguageFragmentFragmentDoc,
    "\n  fragment LocationFragment on Location {\n    canonical\n    fullTextUrl\n    landingPage\n    locationPlatform\n    locationId\n  }\n": types.LocationFragmentFragmentDoc,
    "\n  fragment PriceFragment on Price {\n    unitPrice\n    priceId\n    currencyCode\n  }\n": types.PriceFragmentFragmentDoc,
    "\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n": types.PublicationFragmentFragmentDoc,
    "\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n": types.ReferenceFragmentFragmentDoc,
    "\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n": types.SubjectFragmentFragmentDoc,
    "\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    subtitle\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      mainLanguage\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      jurisdiction\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n  }\n": types.WorkFragmentFragmentDoc,
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
export function graphql(source: "\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    )\n  }\n"): (typeof documents)["\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    )\n  }\n"];
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
export function graphql(source: "\n  mutation CreateFunding($data: NewFunding!) {\n    createFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateFunding($data: NewFunding!) {\n    createFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateFunding($data: PatchFunding!) {\n    updateFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateFunding($data: PatchFunding!) {\n    updateFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteFunding($fundingId: Uuid!) {\n    deleteFunding(fundingId: $fundingId) {\n      ...FundingFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteFunding($fundingId: Uuid!) {\n    deleteFunding(fundingId: $fundingId) {\n      ...FundingFragment\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation CreateLanguage($data: NewLanguage!) {\n    createLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateLanguage($data: NewLanguage!) {\n    createLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateLanguage($data: PatchLanguage!) {\n    updateLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateLanguage($data: PatchLanguage!) {\n    updateLanguage(data: $data) {\n      ...LanguageFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteLanguage($languageId: Uuid!) {\n    deleteLanguage(languageId: $languageId) {\n      languageId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteLanguage($languageId: Uuid!) {\n    deleteLanguage(languageId: $languageId) {\n      languageId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateLocation($data: NewLocation!) {\n    createLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateLocation($data: NewLocation!) {\n    createLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateLocation($data: PatchLocation!) {\n    updateLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateLocation($data: PatchLocation!) {\n    updateLocation(data: $data) {\n      ...LocationFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteLocation($locationId: Uuid!) {\n    deleteLocation(locationId: $locationId) {\n      locationId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteLocation($locationId: Uuid!) {\n    deleteLocation(locationId: $locationId) {\n      locationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePrice($data: NewPrice!) {\n    createPrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePrice($data: NewPrice!) {\n    createPrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeletePrice($priceId: Uuid!) {\n    deletePrice(priceId: $priceId) {\n      priceId\n    }\n  }\n"): (typeof documents)["\n  mutation DeletePrice($priceId: Uuid!) {\n    deletePrice(priceId: $priceId) {\n      priceId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePrice($data: PatchPrice!) {\n    updatePrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePrice($data: PatchPrice!) {\n    updatePrice(data: $data) {\n      ...PriceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePublication($data: PatchPublication!) {\n    updatePublication(data: $data) {\n      publicationId\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePublication($data: PatchPublication!) {\n    updatePublication(data: $data) {\n      publicationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeletePublication($publicationId: Uuid!) {\n    deletePublication(publicationId: $publicationId) {\n      publicationId\n    }\n  }\n"): (typeof documents)["\n  mutation DeletePublication($publicationId: Uuid!) {\n    deletePublication(publicationId: $publicationId) {\n      publicationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      publisherId\n      publisherName\n      publisherShortname\n      publisherUrl\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateReference($data: NewReference!) {\n    createReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateReference($data: NewReference!) {\n    createReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateReference($data: PatchReference!) {\n    updateReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateReference($data: PatchReference!) {\n    updateReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteReference($referenceId: Uuid!) {\n    deleteReference(referenceId: $referenceId) {\n      ...ReferenceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteReference($referenceId: Uuid!) {\n    deleteReference(referenceId: $referenceId) {\n      ...ReferenceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSeriesCount($publishers: [Uuid!]!) {\n    seriesCount(publishers: $publishers)\n  }\n"): (typeof documents)["\n  query GetSeriesCount($publishers: [Uuid!]!) {\n    seriesCount(publishers: $publishers)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSeries($data: NewSeries!) {\n    createSeries(data: $data) {\n      seriesId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSeries($data: NewSeries!) {\n    createSeries(data: $data) {\n      seriesId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSeries($data: PatchSeries!) {\n    updateSeries(data: $data) {\n      seriesId\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSeries($data: PatchSeries!) {\n    updateSeries(data: $data) {\n      seriesId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteSeries($seriesId: Uuid!) {\n    deleteSeries(seriesId: $seriesId) {\n      seriesId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteSeries($seriesId: Uuid!) {\n    deleteSeries(seriesId: $seriesId) {\n      seriesId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateIssue($data: NewIssue!) {\n    createIssue(data: $data) {\n      issueId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateIssue($data: NewIssue!) {\n    createIssue(data: $data) {\n      issueId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateIssue($data: PatchIssue!) {\n    updateIssue(data: $data) {\n      issueId\n      issueOrdinal\n      seriesId\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateIssue($data: PatchIssue!) {\n    updateIssue(data: $data) {\n      issueId\n      issueOrdinal\n      seriesId\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteIssue($issueId: Uuid!) {\n    deleteIssue(issueId: $issueId) {\n      issueId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteIssue($issueId: Uuid!) {\n    deleteIssue(issueId: $issueId) {\n      issueId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSubject($data: NewSubject!) {\n    createSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSubject($data: NewSubject!) {\n    createSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSubject($data: PatchSubject!) {\n    updateSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSubject($data: PatchSubject!) {\n    updateSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteSubject($subjectId: Uuid!) {\n    deleteSubject(subjectId: $subjectId) {\n      ...SubjectFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteSubject($subjectId: Uuid!) {\n    deleteSubject(subjectId: $subjectId) {\n      ...SubjectFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWork($data: NewWork!) {\n    createWork(data: $data) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n      contributionId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n      contributionId\n    }\n  }\n"];
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
export function graphql(source: "\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      publicationDate\n      withdrawnDate\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      reference\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n      languages {\n        languageId\n        languageCode\n        languageRelation\n        mainLanguage\n      }\n      fundings {\n        fundingId\n        grantNumber\n        institutionId\n        jurisdiction\n        program\n        projectName\n        projectShortname\n        institution {\n          institutionName\n          ror\n        }\n      }\n      publications {\n        publicationId\n        isbn\n        publicationType\n        updatedAt\n        weightG: weight(units: G)\n        weightOz: weight(units: OZ)\n        widthMm: width(units: MM)\n        widthIn: width(units: IN)\n        heightMm: height(units: MM)\n        heightIn: height(units: IN)\n        depthMm: depth(units: MM)\n        depthIn: depth(units: IN)\n        work {\n          doi\n          title\n          imprint {\n            publisher {\n              publisherName\n            }\n          }\n        }\n        prices {\n          unitPrice\n          priceId\n          currencyCode\n        }\n        locations {\n          canonical\n          fullTextUrl\n          landingPage\n          locationPlatform\n          locationId\n        }\n      }\n      references {\n        doi\n        referenceId\n        referenceOrdinal\n        unstructuredCitation\n        journalTitle\n        articleTitle\n        seriesTitle\n        volumeTitle\n        url\n      }\n      subjects {\n        subjectId\n        subjectCode\n        subjectType\n        subjectOrdinal\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetChapters($publishers: [Uuid!]!) {\n    chapters(publishers: $publishers) {\n      doi\n      workId\n      title\n      fullTitle\n      workType\n      updatedAt\n      publicationDate\n      withdrawnDate\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n      imprintId\n      workStatus\n      edition\n      reference\n      contributions {\n        fullName\n        lastName\n        contributionId\n        contributorId\n        contributionType\n        mainContribution\n        contributionOrdinal\n        biography\n        contributor {\n          orcid\n        }\n        affiliations {\n          position\n          affiliationId\n          affiliationOrdinal\n          institution {\n            ror\n            institutionName\n            institutionId\n          }\n        }\n      }\n      languages {\n        languageId\n        languageCode\n        languageRelation\n        mainLanguage\n      }\n      fundings {\n        fundingId\n        grantNumber\n        institutionId\n        jurisdiction\n        program\n        projectName\n        projectShortname\n        institution {\n          institutionName\n          ror\n        }\n      }\n      publications {\n        publicationId\n        isbn\n        publicationType\n        updatedAt\n        weightG: weight(units: G)\n        weightOz: weight(units: OZ)\n        widthMm: width(units: MM)\n        widthIn: width(units: IN)\n        heightMm: height(units: MM)\n        heightIn: height(units: IN)\n        depthMm: depth(units: MM)\n        depthIn: depth(units: IN)\n        work {\n          doi\n          title\n          imprint {\n            publisher {\n              publisherName\n            }\n          }\n        }\n        prices {\n          unitPrice\n          priceId\n          currencyCode\n        }\n        locations {\n          canonical\n          fullTextUrl\n          landingPage\n          locationPlatform\n          locationId\n        }\n      }\n      references {\n        doi\n        referenceId\n        referenceOrdinal\n        unstructuredCitation\n        journalTitle\n        articleTitle\n        seriesTitle\n        volumeTitle\n        url\n      }\n      subjects {\n        subjectId\n        subjectCode\n        subjectType\n        subjectOrdinal\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n"];
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
export function graphql(source: "\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n"): (typeof documents)["\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n"): (typeof documents)["\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n"): (typeof documents)["\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    jurisdiction\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n"): (typeof documents)["\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    jurisdiction\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n    mainLanguage\n  }\n"): (typeof documents)["\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n    mainLanguage\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment LocationFragment on Location {\n    canonical\n    fullTextUrl\n    landingPage\n    locationPlatform\n    locationId\n  }\n"): (typeof documents)["\n  fragment LocationFragment on Location {\n    canonical\n    fullTextUrl\n    landingPage\n    locationPlatform\n    locationId\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PriceFragment on Price {\n    unitPrice\n    priceId\n    currencyCode\n  }\n"): (typeof documents)["\n  fragment PriceFragment on Price {\n    unitPrice\n    priceId\n    currencyCode\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n"): (typeof documents)["\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n"): (typeof documents)["\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    subtitle\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      mainLanguage\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      jurisdiction\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment WorkFragment on Work {\n    doi\n    workId\n    title\n    subtitle\n    fullTitle\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    imprint {\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biography\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      mainLanguage\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      jurisdiction\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;