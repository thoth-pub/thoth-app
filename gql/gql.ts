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
    "\n  mutation CreateAbstract($data: NewAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    createAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n": typeof types.CreateAbstractDocument,
    "\n  mutation UpdateAbstract($data: PatchAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n": typeof types.UpdateAbstractDocument,
    "\n  mutation DeleteAbstract($abstractId: Uuid!) {\n    deleteAbstract(abstractId: $abstractId) {\n      abstractId\n    }\n  }\n": typeof types.DeleteAbstractDocument,
    "\n  mutation CreateAdditionalResource($data: NewAdditionalResource!, $markupFormat: MarkupFormat) {\n    createAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n": typeof types.CreateAdditionalResourceDocument,
    "\n  mutation UpdateAdditionalResource($data: PatchAdditionalResource!, $markupFormat: MarkupFormat) {\n    updateAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n": typeof types.UpdateAdditionalResourceDocument,
    "\n  mutation DeleteAdditionalResource($additionalResourceId: Uuid!) {\n    deleteAdditionalResource(additionalResourceId: $additionalResourceId) {\n      ...WorkResourceFragment\n    }\n  }\n": typeof types.DeleteAdditionalResourceDocument,
    "\n  mutation MoveAdditionalResource($additionalResourceId: Uuid!, $newOrdinal: Int!) {\n    moveAdditionalResource(additionalResourceId: $additionalResourceId, newOrdinal: $newOrdinal) {\n      ...WorkResourceFragment\n    }\n  }\n": typeof types.MoveAdditionalResourceDocument,
    "\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": typeof types.CreateAffiliationDocument,
    "\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": typeof types.UpdateAffiliationDocument,
    "\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n": typeof types.DeleteAffiliationDocument,
    "\n  mutation MoveAffiliation($affiliationId: Uuid!, $newOrdinal: Int!) {\n    moveAffiliation(affiliationId: $affiliationId, newOrdinal: $newOrdinal) {\n      ...AffiliationFragment\n    }\n  }\n": typeof types.MoveAffiliationDocument,
    "\n  mutation CreateAward($data: NewAward!, $markupFormat: MarkupFormat) {\n    createAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n": typeof types.CreateAwardDocument,
    "\n  mutation UpdateAward($data: PatchAward!, $markupFormat: MarkupFormat) {\n    updateAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n": typeof types.UpdateAwardDocument,
    "\n  mutation DeleteAward($awardId: Uuid!) {\n    deleteAward(awardId: $awardId) {\n      ...AwardFragment\n    }\n  }\n": typeof types.DeleteAwardDocument,
    "\n  mutation MoveAward($awardId: Uuid!, $newOrdinal: Int!) {\n    moveAward(awardId: $awardId, newOrdinal: $newOrdinal) {\n      ...AwardFragment\n    }\n  }\n": typeof types.MoveAwardDocument,
    "\n  mutation CreateBookReview($data: NewBookReview!, $markupFormat: MarkupFormat) {\n    createBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n": typeof types.CreateBookReviewDocument,
    "\n  mutation UpdateBookReview($data: PatchBookReview!, $markupFormat: MarkupFormat) {\n    updateBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n": typeof types.UpdateBookReviewDocument,
    "\n  mutation DeleteBookReview($bookReviewId: Uuid!) {\n    deleteBookReview(bookReviewId: $bookReviewId) {\n      ...BookReviewFragment\n    }\n  }\n": typeof types.DeleteBookReviewDocument,
    "\n  mutation MoveBookReview($bookReviewId: Uuid!, $newOrdinal: Int!) {\n    moveBookReview(bookReviewId: $bookReviewId, newOrdinal: $newOrdinal) {\n      ...BookReviewFragment\n    }\n  }\n": typeof types.MoveBookReviewDocument,
    "\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetBooksDocument,
    "\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n    $publicationDate: TimeExpression\n    $workStatuses: [WorkStatus!]\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n      publicationDate: $publicationDate\n      workStatuses: $workStatuses\n    )\n  }\n": typeof types.GetBooksCountDocument,
    "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n      contributionId\n    }\n  }\n": typeof types.CreateContributionDocument,
    "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n": typeof types.DeleteContributionDocument,
    "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n": typeof types.UpdateContributionDocument,
    "\n  mutation MoveContribution($contributionId: Uuid!, $newOrdinal: Int!) {\n    moveContribution(contributionId: $contributionId, newOrdinal: $newOrdinal) {\n      workId\n    }\n  }\n": typeof types.MoveContributionDocument,
    "\n  mutation CreateBiography($data: NewBiography!, $markupFormat: MarkupFormat!) {\n    createBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n": typeof types.CreateBiographyDocument,
    "\n  mutation UpdateBiography($data: PatchBiography!, $markupFormat: MarkupFormat!) {\n    updateBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n": typeof types.UpdateBiographyDocument,
    "\n  mutation DeleteBiography($biographyId: Uuid!) {\n    deleteBiography(biographyId: $biographyId) {\n      ...BiographyFragment\n    }\n  }\n": typeof types.DeleteBiographyDocument,
    "\n  query GetContributionBiographies($contributionId: Uuid!) {\n    contribution(contributionId: $contributionId) {\n      biographies {\n        ...BiographyFragment\n        contributionId\n        work {\n          workId\n        }\n      }\n    }\n  }\n": typeof types.GetContributionBiographiesDocument,
    "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n      contributions(order: { field: UPDATED_AT, direction: DESC }, limit: 1) {\n        work {\n          title\n        }\n      }\n    }\n  }\n": typeof types.GetContributorsDocument,
    "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetLinkedPublishersDocument,
    "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.CreateContributorDocument,
    "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.UpdateContributorDocument,
    "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n": typeof types.GetContributorDocument,
    "\n  mutation CreateEndorsement($markupFormat: MarkupFormat, $data: NewEndorsement!) {\n    createEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": typeof types.CreateEndorsementDocument,
    "\n  mutation UpdateEndorsement($markupFormat: MarkupFormat, $data: PatchEndorsement!) {\n    updateEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": typeof types.UpdateEndorsementDocument,
    "\n  mutation DeleteEndorsement($endorsementId: Uuid!) {\n    deleteEndorsement(endorsementId: $endorsementId) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": typeof types.DeleteEndorsementDocument,
    "\n  mutation MoveEndorsement($endorsementId: Uuid!, $newOrdinal: Int!) {\n    moveEndorsement(endorsementId: $endorsementId, newOrdinal: $newOrdinal) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": typeof types.MoveEndorsementDocument,
    "\n  mutation CreateWorkFeaturedVideo($data: NewWorkFeaturedVideo!) {\n    createWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n": typeof types.CreateWorkFeaturedVideoDocument,
    "\n  mutation UpdateWorkFeaturedVideo($data: PatchWorkFeaturedVideo!) {\n    updateWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n": typeof types.UpdateWorkFeaturedVideoDocument,
    "\n  mutation DeleteWorkFeaturedVideo($workFeaturedVideoId: Uuid!) {\n    deleteWorkFeaturedVideo(workFeaturedVideoId: $workFeaturedVideoId) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n": typeof types.DeleteWorkFeaturedVideoDocument,
    "\n  mutation CreateFunding($data: NewFunding!) {\n    createFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": typeof types.CreateFundingDocument,
    "\n  mutation UpdateFunding($data: PatchFunding!) {\n    updateFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": typeof types.UpdateFundingDocument,
    "\n  mutation DeleteFunding($fundingId: Uuid!) {\n    deleteFunding(fundingId: $fundingId) {\n      ...FundingFragment\n    }\n  }\n": typeof types.DeleteFundingDocument,
    "\n  mutation CreateImprint($data: NewImprint!) {\n    createImprint(data: $data) {\n      imprintId\n    }\n  }\n": typeof types.CreateImprintDocument,
    "\n  mutation UpdateImprint($data: PatchImprint!) {\n    updateImprint(data: $data) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n": typeof types.UpdateImprintDocument,
    "\n  mutation DeleteImprint($imprintId: Uuid!) {\n    deleteImprint(imprintId: $imprintId) {\n      imprintId\n    }\n  }\n": typeof types.DeleteImprintDocument,
    "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n": typeof types.GetImprintsCountDocument,
    "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n": typeof types.GetImprintsDocument,
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
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n": typeof types.GetPublicationsDocument,
    "\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n": typeof types.CreatePublicationDocument,
    "\n  mutation UpdatePublication($data: PatchPublication!) {\n    updatePublication(data: $data) {\n      publicationId\n    }\n  }\n": typeof types.UpdatePublicationDocument,
    "\n  mutation DeletePublication($publicationId: Uuid!) {\n    deletePublication(publicationId: $publicationId) {\n      publicationId\n    }\n  }\n": typeof types.DeletePublicationDocument,
    "\n  mutation CreateContact($data: NewContact!) {\n    createContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n": typeof types.CreateContactDocument,
    "\n  mutation UpdateContact($data: PatchContact!) {\n    updateContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n": typeof types.UpdateContactDocument,
    "\n  mutation DeleteContact($contactId: Uuid!) {\n    deleteContact(contactId: $contactId) {\n      contactId\n    }\n  }\n": typeof types.DeleteContactDocument,
    "\n  mutation CreatePublisher($data: NewPublisher!) {\n    createPublisher(data: $data) {\n      publisherId\n    }\n  }\n": typeof types.CreatePublisherDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      ...PublisherFragment\n    }\n  }\n": typeof types.GetPublishersDocument,
    "\n  query GetPublisher($publisherId: Uuid!) {\n    publisher(publisherId: $publisherId) {\n      ...PublisherFragment\n    }\n  }\n": typeof types.GetPublisherDocument,
    "\n  mutation UpdatePublisher($data: PatchPublisher!) {\n    updatePublisher(data: $data) {\n      ...PublisherFragment\n    }\n  }\n": typeof types.UpdatePublisherDocument,
    "\n  mutation CreateReference($data: NewReference!) {\n    createReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.CreateReferenceDocument,
    "\n  mutation UpdateReference($data: PatchReference!) {\n    updateReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.UpdateReferenceDocument,
    "\n  mutation DeleteReference($referenceId: Uuid!) {\n    deleteReference(referenceId: $referenceId) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.DeleteReferenceDocument,
    "\n  mutation MoveReference($referenceId: Uuid!, $newOrdinal: Int!) {\n    moveReference(referenceId: $referenceId, newOrdinal: $newOrdinal) {\n      ...ReferenceFragment\n    }\n  }\n": typeof types.MoveReferenceDocument,
    "\n  mutation CreateSeries($data: NewSeries!) {\n    createSeries(data: $data) {\n      seriesId\n    }\n  }\n": typeof types.CreateSeriesDocument,
    "\n  mutation UpdateSeries($data: PatchSeries!) {\n    updateSeries(data: $data) {\n      seriesId\n    }\n  }\n": typeof types.UpdateSeriesDocument,
    "\n  mutation DeleteSeries($seriesId: Uuid!) {\n    deleteSeries(seriesId: $seriesId) {\n      seriesId\n    }\n  }\n": typeof types.DeleteSeriesDocument,
    "\n  mutation CreateIssue($data: NewIssue!) {\n    createIssue(data: $data) {\n      issueId\n    }\n  }\n": typeof types.CreateIssueDocument,
    "\n  mutation UpdateIssue($data: PatchIssue!) {\n    updateIssue(data: $data) {\n      issueId\n      issueOrdinal\n      seriesId\n      workId\n    }\n  }\n": typeof types.UpdateIssueDocument,
    "\n  mutation DeleteIssue($issueId: Uuid!) {\n    deleteIssue(issueId: $issueId) {\n      issueId\n    }\n  }\n": typeof types.DeleteIssueDocument,
    "\n  mutation MoveIssue($issueId: Uuid!, $newOrdinal: Int!) {\n    moveIssue(issueId: $issueId, newOrdinal: $newOrdinal) {\n      issueId\n    }\n  }\n": typeof types.MoveIssueDocument,
    "\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n": typeof types.GetSeriesesDocument,
    "\n  query GetSeriesCount($publishers: [Uuid!]!, $filter: String) {\n    seriesCount(publishers: $publishers, filter: $filter)\n  }\n": typeof types.GetSeriesCountDocument,
    "\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n": typeof types.GetSeriesDocument,
    "\n  mutation CreateSet($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...SetFragment\n    }\n  }\n": typeof types.CreateSetDocument,
    "\n  mutation UpdateSet($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...SetFragment\n    }\n  }\n": typeof types.UpdateSetDocument,
    "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n": typeof types.DeleteWorkDocument,
    "\n  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {\n    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {\n      workRelationId\n    }\n  }\n": typeof types.MoveWorkRelationDocument,
    "\n  mutation AddBookToSet($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n": typeof types.AddBookToSetDocument,
    "\n  mutation DeleteBookFromSet($workRelationId: Uuid!) {\n    deleteWorkRelation(workRelationId: $workRelationId) {\n      workRelationId\n    }\n  }\n": typeof types.DeleteBookFromSetDocument,
    "\n  query GetSets(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      workTypes: [BOOK_SET]\n    ) {\n      ...SetFragment\n    }\n  }\n": typeof types.GetSetsDocument,
    "\n  query GetSet($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...SetFragment\n    }\n  }\n": typeof types.GetSetDocument,
    "\n  query GetSetsCount($publishers: [Uuid!]!, $filter: String) {\n    workCount(publishers: $publishers, workTypes: [BOOK_SET], filter: $filter)\n  }\n": typeof types.GetSetsCountDocument,
    "\n  query GetBookSetWorks($setId: Uuid!, $markupFormat: MarkupFormat = PLAIN_TEXT) {\n    work(workId: $setId) {\n      relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n        relationOrdinal\n        workRelationId\n        relatedWorkId\n        relatedWork {\n          titles(markupFormat: $markupFormat) {\n            canonical\n            fullTitle\n            localeCode\n            subtitle\n            title\n            titleId\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetBookSetWorksDocument,
    "\n  mutation CreateSubject($data: NewSubject!) {\n    createSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": typeof types.CreateSubjectDocument,
    "\n  mutation UpdateSubject($data: PatchSubject!) {\n    updateSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": typeof types.UpdateSubjectDocument,
    "\n  mutation DeleteSubject($subjectId: Uuid!) {\n    deleteSubject(subjectId: $subjectId) {\n      ...SubjectFragment\n    }\n  }\n": typeof types.DeleteSubjectDocument,
    "\n  mutation MoveSubject($subjectId: Uuid!, $newOrdinal: Int!) {\n    moveSubject(subjectId: $subjectId, newOrdinal: $newOrdinal) {\n      subjectId\n    }\n  }\n": typeof types.MoveSubjectDocument,
    "\n  mutation CreateTitle($data: NewTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    createTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n": typeof types.CreateTitleDocument,
    "\n  mutation UpdateTitle($data: PatchTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n": typeof types.UpdateTitleDocument,
    "\n  mutation DeleteTitle($titleId: Uuid!) {\n    deleteTitle(titleId: $titleId) {\n      titleId\n    }\n  }\n": typeof types.DeleteTitleDocument,
    "\n  query GetUser {\n    me {\n      userId\n      email\n      firstName\n      lastName\n      isSuperuser\n      publisherContexts {\n        publisher {\n          publisherName\n          publisherId\n          imprints {\n            imprintId\n            imprintName\n            imprintUrl\n            updatedAt\n            crossmarkDoi\n            defaultCurrency\n            defaultLocale\n            defaultPlace\n          }\n        }\n        permissions {\n          publisherAdmin\n          workLifecycle\n          cdnWrite\n        }\n      }\n    }\n  }\n": typeof types.GetUserDocument,
    "\n  mutation CreateWork($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": typeof types.CreateWorkDocument,
    "\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetWorksDocument,
    "\n  query GetWork($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n": typeof types.GetWorkDocument,
    "\n  mutation UpdateWork($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": typeof types.UpdateWorkDocument,
    "\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n": typeof types.GetWorksCountDocument,
    "\n  query GetWorkChapters($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_CHILD\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": typeof types.GetWorkChaptersDocument,
    "\n  query GetWorkTranslations($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_TRANSLATION\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": typeof types.GetWorkTranslationsDocument,
    "\n  query GetWorkEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_REPLACED_BY\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": typeof types.GetWorkEditionsDocument,
    "\n  query GetWorkPrevEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: REPLACES\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": typeof types.GetWorkPrevEditionsDocument,
    "\n  query GetTranslatedWorks($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_TRANSLATION_OF\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": typeof types.GetTranslatedWorksDocument,
    "\n  mutation CreateWorkRelation($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n": typeof types.CreateWorkRelationDocument,
    "\n  query GetWorkSet($workId: Uuid!) {\n    work(workId: $workId) {\n      relations(relationTypes: IS_PART_OF) {\n        workRelationId\n        relatedWork {\n          titles(markupFormat: PLAIN_TEXT) {\n            ...TitleFragment\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetWorkSetDocument,
    "\n  fragment AbstractFragment on Abstract {\n    abstractId\n    abstractType\n    canonical\n    content\n    localeCode\n  }\n": typeof types.AbstractFragmentFragmentDoc,
    "\n  fragment WorkResourceFragment on WorkResource {\n    workResourceId\n    workId\n    title\n    description\n    attribution\n    resourceType\n    doi\n    handle\n    url\n    resourceOrdinal\n  }\n": typeof types.WorkResourceFragmentFragmentDoc,
    "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n": typeof types.AffiliationFragmentFragmentDoc,
    "\n  fragment AwardFragment on Award {\n    awardId\n    workId\n    title\n    url\n    category\n    role\n    prizeStatement\n    awardOrdinal\n  }\n": typeof types.AwardFragmentFragmentDoc,
    "\n  fragment BiographyFragment on Biography {\n    biographyId\n    canonical\n    content\n    localeCode\n    contributionId\n  }\n": typeof types.BiographyFragmentFragmentDoc,
    "\n  fragment BookReviewFragment on BookReview {\n    bookReviewId\n    workId\n    title\n    authorName\n    url\n    doi\n    reviewDate\n    journalName\n    journalVolume\n    journalNumber\n    journalIssn\n    text\n    reviewOrdinal\n  }\n": typeof types.BookReviewFragmentFragmentDoc,
    "\n  fragment ContributionFragment on Contribution {\n    workId\n    contributionId\n    mainContribution\n    fullName\n    lastName\n    firstName\n    contributionType\n    contributionOrdinal\n    biographies {\n      ...BiographyFragment\n    }\n    contributor {\n      ...ContributorFragment\n    }\n    contributorId\n    affiliations {\n      ...AffiliationFragment\n    }\n  }\n": typeof types.ContributionFragmentFragmentDoc,
    "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n": typeof types.ContributorFragmentFragmentDoc,
    "\n  fragment EndorsementFragment on Endorsement {\n    endorsementId\n    workId\n    authorName\n    authorRole\n    url\n    text\n    endorsementOrdinal\n  }\n": typeof types.EndorsementFragmentFragmentDoc,
    "\n  fragment WorkFeaturedVideoFragment on WorkFeaturedVideo {\n    workFeaturedVideoId\n    workId\n    title\n    url\n    width\n    height\n  }\n": typeof types.WorkFeaturedVideoFragmentFragmentDoc,
    "\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n": typeof types.FundingFragmentFragmentDoc,
    "\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n  }\n": typeof types.LanguageFragmentFragmentDoc,
    "\n  fragment LocationFragment on Location {\n    canonical\n    fullTextUrl\n    landingPage\n    locationPlatform\n    locationId\n  }\n": typeof types.LocationFragmentFragmentDoc,
    "\n  fragment PriceFragment on Price {\n    unitPrice\n    priceId\n    currencyCode\n  }\n": typeof types.PriceFragmentFragmentDoc,
    "\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n    file {\n      cdnUrl\n    }\n  }\n": typeof types.PublicationFragmentFragmentDoc,
    "\n  fragment PublisherFragment on Publisher {\n    publisherId\n    publisherName\n    publisherShortname\n    publisherUrl\n    updatedAt\n    accessibilityReportUrl\n    accessibilityStatement\n    contacts {\n      contactId\n      contactType\n      email\n    }\n  }\n": typeof types.PublisherFragmentFragmentDoc,
    "\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n": typeof types.ReferenceFragmentFragmentDoc,
    "\n  fragment SetFragment on Work {\n    workId\n    workType\n    workStatus\n    updatedAt\n    imprintId\n    edition\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n      relationOrdinal\n      relatedWork {\n        coverUrl\n      }\n    }\n  }\n": typeof types.SetFragmentFragmentDoc,
    "\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n": typeof types.SubjectFragmentFragmentDoc,
    "\n  fragment TitleFragment on Title {\n    canonical\n    fullTitle\n    localeCode\n    subtitle\n    title\n    titleId\n  }\n": typeof types.TitleFragmentFragmentDoc,
    "\n  fragment WorkFragment on Work {\n    doi\n    lccn\n    oclc\n    workId\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    abstracts(markupFormat: $markupFormat) {\n      abstractId\n      abstractType\n      canonical\n      content\n      localeCode\n    }\n    bibliographyNote\n    generalNote\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    place\n    imprint {\n      imprintName\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    firstPage\n    lastPage\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biographies(markupFormat: $markupFormat) {\n        biographyId\n        canonical\n        content\n        localeCode\n        contributionId\n      }\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      accessibilityAdditionalStandard\n      accessibilityException\n      accessibilityReportUrl\n      accessibilityStandard\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n      file {\n        cdnUrl\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n    awards {\n      awardId\n      workId\n      title\n      url\n      category\n      role\n      prizeStatement\n      awardOrdinal\n    }\n    additionalResources {\n      workResourceId\n      workId\n      title\n      description\n      attribution\n      resourceType\n      doi\n      handle\n      url\n      resourceOrdinal\n    }\n    bookReviews {\n      bookReviewId\n      workId\n      title\n      authorName\n      url\n      doi\n      reviewDate\n      journalName\n      journalVolume\n      journalNumber\n      journalIssn\n      text\n      reviewOrdinal\n    }\n    endorsements {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n    featuredVideo {\n      workFeaturedVideoId\n      workId\n      title\n      url\n      width\n      height\n    }\n  }\n": typeof types.WorkFragmentFragmentDoc,
    "\n  mutation InitFrontcoverFileUpload($data: NewFrontcoverFileUpload!) {\n    initFrontcoverFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n": typeof types.InitFrontcoverFileUploadDocument,
    "\n  mutation InitPublicationFileUpload($data: NewPublicationFileUpload!) {\n    initPublicationFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n": typeof types.InitPublicationFileUploadDocument,
    "\n  mutation CompleteFileUpload($data: CompleteFileUpload!) {\n    completeFileUpload(data: $data) {\n      fileId\n      fileType\n      mimeType\n      bytes\n      objectKey\n      cdnUrl\n    }\n  }\n": typeof types.CompleteFileUploadDocument,
};
const documents: Documents = {
    "\n  mutation CreateAbstract($data: NewAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    createAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n": types.CreateAbstractDocument,
    "\n  mutation UpdateAbstract($data: PatchAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n": types.UpdateAbstractDocument,
    "\n  mutation DeleteAbstract($abstractId: Uuid!) {\n    deleteAbstract(abstractId: $abstractId) {\n      abstractId\n    }\n  }\n": types.DeleteAbstractDocument,
    "\n  mutation CreateAdditionalResource($data: NewAdditionalResource!, $markupFormat: MarkupFormat) {\n    createAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n": types.CreateAdditionalResourceDocument,
    "\n  mutation UpdateAdditionalResource($data: PatchAdditionalResource!, $markupFormat: MarkupFormat) {\n    updateAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n": types.UpdateAdditionalResourceDocument,
    "\n  mutation DeleteAdditionalResource($additionalResourceId: Uuid!) {\n    deleteAdditionalResource(additionalResourceId: $additionalResourceId) {\n      ...WorkResourceFragment\n    }\n  }\n": types.DeleteAdditionalResourceDocument,
    "\n  mutation MoveAdditionalResource($additionalResourceId: Uuid!, $newOrdinal: Int!) {\n    moveAdditionalResource(additionalResourceId: $additionalResourceId, newOrdinal: $newOrdinal) {\n      ...WorkResourceFragment\n    }\n  }\n": types.MoveAdditionalResourceDocument,
    "\n  mutation CreateAffiliation($data: NewAffiliation!) {\n    createAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": types.CreateAffiliationDocument,
    "\n  mutation UpdateAffiliation($data: PatchAffiliation!) {\n    updateAffiliation(data: $data) {\n      ...AffiliationFragment\n    }\n  }\n": types.UpdateAffiliationDocument,
    "\n  mutation DeleteAffiliation($affiliationId: Uuid!) {\n    deleteAffiliation(affiliationId: $affiliationId) {\n      affiliationId\n    }\n  }\n": types.DeleteAffiliationDocument,
    "\n  mutation MoveAffiliation($affiliationId: Uuid!, $newOrdinal: Int!) {\n    moveAffiliation(affiliationId: $affiliationId, newOrdinal: $newOrdinal) {\n      ...AffiliationFragment\n    }\n  }\n": types.MoveAffiliationDocument,
    "\n  mutation CreateAward($data: NewAward!, $markupFormat: MarkupFormat) {\n    createAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n": types.CreateAwardDocument,
    "\n  mutation UpdateAward($data: PatchAward!, $markupFormat: MarkupFormat) {\n    updateAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n": types.UpdateAwardDocument,
    "\n  mutation DeleteAward($awardId: Uuid!) {\n    deleteAward(awardId: $awardId) {\n      ...AwardFragment\n    }\n  }\n": types.DeleteAwardDocument,
    "\n  mutation MoveAward($awardId: Uuid!, $newOrdinal: Int!) {\n    moveAward(awardId: $awardId, newOrdinal: $newOrdinal) {\n      ...AwardFragment\n    }\n  }\n": types.MoveAwardDocument,
    "\n  mutation CreateBookReview($data: NewBookReview!, $markupFormat: MarkupFormat) {\n    createBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n": types.CreateBookReviewDocument,
    "\n  mutation UpdateBookReview($data: PatchBookReview!, $markupFormat: MarkupFormat) {\n    updateBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n": types.UpdateBookReviewDocument,
    "\n  mutation DeleteBookReview($bookReviewId: Uuid!) {\n    deleteBookReview(bookReviewId: $bookReviewId) {\n      ...BookReviewFragment\n    }\n  }\n": types.DeleteBookReviewDocument,
    "\n  mutation MoveBookReview($bookReviewId: Uuid!, $newOrdinal: Int!) {\n    moveBookReview(bookReviewId: $bookReviewId, newOrdinal: $newOrdinal) {\n      ...BookReviewFragment\n    }\n  }\n": types.MoveBookReviewDocument,
    "\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n": types.GetBooksDocument,
    "\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n    $publicationDate: TimeExpression\n    $workStatuses: [WorkStatus!]\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n      publicationDate: $publicationDate\n      workStatuses: $workStatuses\n    )\n  }\n": types.GetBooksCountDocument,
    "\n  mutation CreateContribution($data: NewContribution!) {\n    createContribution(data: $data) {\n      workId\n      contributionId\n    }\n  }\n": types.CreateContributionDocument,
    "\n  mutation DeleteContribution($contributionId: Uuid!) {\n    deleteContribution(contributionId: $contributionId) {\n      workId\n    }\n  }\n": types.DeleteContributionDocument,
    "\n  mutation UpdateContribution($data: PatchContribution!) {\n    updateContribution(data: $data) {\n      workId\n    }\n  }\n": types.UpdateContributionDocument,
    "\n  mutation MoveContribution($contributionId: Uuid!, $newOrdinal: Int!) {\n    moveContribution(contributionId: $contributionId, newOrdinal: $newOrdinal) {\n      workId\n    }\n  }\n": types.MoveContributionDocument,
    "\n  mutation CreateBiography($data: NewBiography!, $markupFormat: MarkupFormat!) {\n    createBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n": types.CreateBiographyDocument,
    "\n  mutation UpdateBiography($data: PatchBiography!, $markupFormat: MarkupFormat!) {\n    updateBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n": types.UpdateBiographyDocument,
    "\n  mutation DeleteBiography($biographyId: Uuid!) {\n    deleteBiography(biographyId: $biographyId) {\n      ...BiographyFragment\n    }\n  }\n": types.DeleteBiographyDocument,
    "\n  query GetContributionBiographies($contributionId: Uuid!) {\n    contribution(contributionId: $contributionId) {\n      biographies {\n        ...BiographyFragment\n        contributionId\n        work {\n          workId\n        }\n      }\n    }\n  }\n": types.GetContributionBiographiesDocument,
    "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n      contributions(order: { field: UPDATED_AT, direction: DESC }, limit: 1) {\n        work {\n          title\n        }\n      }\n    }\n  }\n": types.GetContributorsDocument,
    "\n  query GetLinkedPublishers($contributorId: Uuid!, $offset: Int!, $limit: Int) {\n    contributor(contributorId: $contributorId) {\n      contributions(offset: $offset, limit: $limit) {\n        work {\n          imprint {\n            publisherId\n          }\n        }\n      }\n    }\n  }\n": types.GetLinkedPublishersDocument,
    "\n  mutation CreateContributor($data: NewContributor!) {\n    createContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": types.CreateContributorDocument,
    "\n  mutation UpdateContributor($data: PatchContributor!) {\n    updateContributor(data: $data) {\n      ...ContributorFragment\n    }\n  }\n": types.UpdateContributorDocument,
    "\n  query GetContributor($contributorId: Uuid!) {\n    contributor(contributorId: $contributorId) {\n      ...ContributorFragment\n    }\n  }\n": types.GetContributorDocument,
    "\n  mutation CreateEndorsement($markupFormat: MarkupFormat, $data: NewEndorsement!) {\n    createEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": types.CreateEndorsementDocument,
    "\n  mutation UpdateEndorsement($markupFormat: MarkupFormat, $data: PatchEndorsement!) {\n    updateEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": types.UpdateEndorsementDocument,
    "\n  mutation DeleteEndorsement($endorsementId: Uuid!) {\n    deleteEndorsement(endorsementId: $endorsementId) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": types.DeleteEndorsementDocument,
    "\n  mutation MoveEndorsement($endorsementId: Uuid!, $newOrdinal: Int!) {\n    moveEndorsement(endorsementId: $endorsementId, newOrdinal: $newOrdinal) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n": types.MoveEndorsementDocument,
    "\n  mutation CreateWorkFeaturedVideo($data: NewWorkFeaturedVideo!) {\n    createWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n": types.CreateWorkFeaturedVideoDocument,
    "\n  mutation UpdateWorkFeaturedVideo($data: PatchWorkFeaturedVideo!) {\n    updateWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n": types.UpdateWorkFeaturedVideoDocument,
    "\n  mutation DeleteWorkFeaturedVideo($workFeaturedVideoId: Uuid!) {\n    deleteWorkFeaturedVideo(workFeaturedVideoId: $workFeaturedVideoId) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n": types.DeleteWorkFeaturedVideoDocument,
    "\n  mutation CreateFunding($data: NewFunding!) {\n    createFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": types.CreateFundingDocument,
    "\n  mutation UpdateFunding($data: PatchFunding!) {\n    updateFunding(data: $data) {\n      ...FundingFragment\n    }\n  }\n": types.UpdateFundingDocument,
    "\n  mutation DeleteFunding($fundingId: Uuid!) {\n    deleteFunding(fundingId: $fundingId) {\n      ...FundingFragment\n    }\n  }\n": types.DeleteFundingDocument,
    "\n  mutation CreateImprint($data: NewImprint!) {\n    createImprint(data: $data) {\n      imprintId\n    }\n  }\n": types.CreateImprintDocument,
    "\n  mutation UpdateImprint($data: PatchImprint!) {\n    updateImprint(data: $data) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n": types.UpdateImprintDocument,
    "\n  mutation DeleteImprint($imprintId: Uuid!) {\n    deleteImprint(imprintId: $imprintId) {\n      imprintId\n    }\n  }\n": types.DeleteImprintDocument,
    "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n": types.GetImprintsCountDocument,
    "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n": types.GetImprintsDocument,
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
    "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n": types.GetPublicationsDocument,
    "\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n": types.CreatePublicationDocument,
    "\n  mutation UpdatePublication($data: PatchPublication!) {\n    updatePublication(data: $data) {\n      publicationId\n    }\n  }\n": types.UpdatePublicationDocument,
    "\n  mutation DeletePublication($publicationId: Uuid!) {\n    deletePublication(publicationId: $publicationId) {\n      publicationId\n    }\n  }\n": types.DeletePublicationDocument,
    "\n  mutation CreateContact($data: NewContact!) {\n    createContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n": types.CreateContactDocument,
    "\n  mutation UpdateContact($data: PatchContact!) {\n    updateContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n": types.UpdateContactDocument,
    "\n  mutation DeleteContact($contactId: Uuid!) {\n    deleteContact(contactId: $contactId) {\n      contactId\n    }\n  }\n": types.DeleteContactDocument,
    "\n  mutation CreatePublisher($data: NewPublisher!) {\n    createPublisher(data: $data) {\n      publisherId\n    }\n  }\n": types.CreatePublisherDocument,
    "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      ...PublisherFragment\n    }\n  }\n": types.GetPublishersDocument,
    "\n  query GetPublisher($publisherId: Uuid!) {\n    publisher(publisherId: $publisherId) {\n      ...PublisherFragment\n    }\n  }\n": types.GetPublisherDocument,
    "\n  mutation UpdatePublisher($data: PatchPublisher!) {\n    updatePublisher(data: $data) {\n      ...PublisherFragment\n    }\n  }\n": types.UpdatePublisherDocument,
    "\n  mutation CreateReference($data: NewReference!) {\n    createReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": types.CreateReferenceDocument,
    "\n  mutation UpdateReference($data: PatchReference!) {\n    updateReference(data: $data) {\n      ...ReferenceFragment\n    }\n  }\n": types.UpdateReferenceDocument,
    "\n  mutation DeleteReference($referenceId: Uuid!) {\n    deleteReference(referenceId: $referenceId) {\n      ...ReferenceFragment\n    }\n  }\n": types.DeleteReferenceDocument,
    "\n  mutation MoveReference($referenceId: Uuid!, $newOrdinal: Int!) {\n    moveReference(referenceId: $referenceId, newOrdinal: $newOrdinal) {\n      ...ReferenceFragment\n    }\n  }\n": types.MoveReferenceDocument,
    "\n  mutation CreateSeries($data: NewSeries!) {\n    createSeries(data: $data) {\n      seriesId\n    }\n  }\n": types.CreateSeriesDocument,
    "\n  mutation UpdateSeries($data: PatchSeries!) {\n    updateSeries(data: $data) {\n      seriesId\n    }\n  }\n": types.UpdateSeriesDocument,
    "\n  mutation DeleteSeries($seriesId: Uuid!) {\n    deleteSeries(seriesId: $seriesId) {\n      seriesId\n    }\n  }\n": types.DeleteSeriesDocument,
    "\n  mutation CreateIssue($data: NewIssue!) {\n    createIssue(data: $data) {\n      issueId\n    }\n  }\n": types.CreateIssueDocument,
    "\n  mutation UpdateIssue($data: PatchIssue!) {\n    updateIssue(data: $data) {\n      issueId\n      issueOrdinal\n      seriesId\n      workId\n    }\n  }\n": types.UpdateIssueDocument,
    "\n  mutation DeleteIssue($issueId: Uuid!) {\n    deleteIssue(issueId: $issueId) {\n      issueId\n    }\n  }\n": types.DeleteIssueDocument,
    "\n  mutation MoveIssue($issueId: Uuid!, $newOrdinal: Int!) {\n    moveIssue(issueId: $issueId, newOrdinal: $newOrdinal) {\n      issueId\n    }\n  }\n": types.MoveIssueDocument,
    "\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n": types.GetSeriesesDocument,
    "\n  query GetSeriesCount($publishers: [Uuid!]!, $filter: String) {\n    seriesCount(publishers: $publishers, filter: $filter)\n  }\n": types.GetSeriesCountDocument,
    "\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n": types.GetSeriesDocument,
    "\n  mutation CreateSet($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...SetFragment\n    }\n  }\n": types.CreateSetDocument,
    "\n  mutation UpdateSet($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...SetFragment\n    }\n  }\n": types.UpdateSetDocument,
    "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n": types.DeleteWorkDocument,
    "\n  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {\n    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {\n      workRelationId\n    }\n  }\n": types.MoveWorkRelationDocument,
    "\n  mutation AddBookToSet($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n": types.AddBookToSetDocument,
    "\n  mutation DeleteBookFromSet($workRelationId: Uuid!) {\n    deleteWorkRelation(workRelationId: $workRelationId) {\n      workRelationId\n    }\n  }\n": types.DeleteBookFromSetDocument,
    "\n  query GetSets(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      workTypes: [BOOK_SET]\n    ) {\n      ...SetFragment\n    }\n  }\n": types.GetSetsDocument,
    "\n  query GetSet($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...SetFragment\n    }\n  }\n": types.GetSetDocument,
    "\n  query GetSetsCount($publishers: [Uuid!]!, $filter: String) {\n    workCount(publishers: $publishers, workTypes: [BOOK_SET], filter: $filter)\n  }\n": types.GetSetsCountDocument,
    "\n  query GetBookSetWorks($setId: Uuid!, $markupFormat: MarkupFormat = PLAIN_TEXT) {\n    work(workId: $setId) {\n      relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n        relationOrdinal\n        workRelationId\n        relatedWorkId\n        relatedWork {\n          titles(markupFormat: $markupFormat) {\n            canonical\n            fullTitle\n            localeCode\n            subtitle\n            title\n            titleId\n          }\n        }\n      }\n    }\n  }\n": types.GetBookSetWorksDocument,
    "\n  mutation CreateSubject($data: NewSubject!) {\n    createSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": types.CreateSubjectDocument,
    "\n  mutation UpdateSubject($data: PatchSubject!) {\n    updateSubject(data: $data) {\n      ...SubjectFragment\n    }\n  }\n": types.UpdateSubjectDocument,
    "\n  mutation DeleteSubject($subjectId: Uuid!) {\n    deleteSubject(subjectId: $subjectId) {\n      ...SubjectFragment\n    }\n  }\n": types.DeleteSubjectDocument,
    "\n  mutation MoveSubject($subjectId: Uuid!, $newOrdinal: Int!) {\n    moveSubject(subjectId: $subjectId, newOrdinal: $newOrdinal) {\n      subjectId\n    }\n  }\n": types.MoveSubjectDocument,
    "\n  mutation CreateTitle($data: NewTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    createTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n": types.CreateTitleDocument,
    "\n  mutation UpdateTitle($data: PatchTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n": types.UpdateTitleDocument,
    "\n  mutation DeleteTitle($titleId: Uuid!) {\n    deleteTitle(titleId: $titleId) {\n      titleId\n    }\n  }\n": types.DeleteTitleDocument,
    "\n  query GetUser {\n    me {\n      userId\n      email\n      firstName\n      lastName\n      isSuperuser\n      publisherContexts {\n        publisher {\n          publisherName\n          publisherId\n          imprints {\n            imprintId\n            imprintName\n            imprintUrl\n            updatedAt\n            crossmarkDoi\n            defaultCurrency\n            defaultLocale\n            defaultPlace\n          }\n        }\n        permissions {\n          publisherAdmin\n          workLifecycle\n          cdnWrite\n        }\n      }\n    }\n  }\n": types.GetUserDocument,
    "\n  mutation CreateWork($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": types.CreateWorkDocument,
    "\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n": types.GetWorksDocument,
    "\n  query GetWork($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n": types.GetWorkDocument,
    "\n  mutation UpdateWork($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n": types.UpdateWorkDocument,
    "\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n": types.GetWorksCountDocument,
    "\n  query GetWorkChapters($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_CHILD\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": types.GetWorkChaptersDocument,
    "\n  query GetWorkTranslations($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_TRANSLATION\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": types.GetWorkTranslationsDocument,
    "\n  query GetWorkEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_REPLACED_BY\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": types.GetWorkEditionsDocument,
    "\n  query GetWorkPrevEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: REPLACES\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": types.GetWorkPrevEditionsDocument,
    "\n  query GetTranslatedWorks($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_TRANSLATION_OF\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n": types.GetTranslatedWorksDocument,
    "\n  mutation CreateWorkRelation($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n": types.CreateWorkRelationDocument,
    "\n  query GetWorkSet($workId: Uuid!) {\n    work(workId: $workId) {\n      relations(relationTypes: IS_PART_OF) {\n        workRelationId\n        relatedWork {\n          titles(markupFormat: PLAIN_TEXT) {\n            ...TitleFragment\n          }\n        }\n      }\n    }\n  }\n": types.GetWorkSetDocument,
    "\n  fragment AbstractFragment on Abstract {\n    abstractId\n    abstractType\n    canonical\n    content\n    localeCode\n  }\n": types.AbstractFragmentFragmentDoc,
    "\n  fragment WorkResourceFragment on WorkResource {\n    workResourceId\n    workId\n    title\n    description\n    attribution\n    resourceType\n    doi\n    handle\n    url\n    resourceOrdinal\n  }\n": types.WorkResourceFragmentFragmentDoc,
    "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n": types.AffiliationFragmentFragmentDoc,
    "\n  fragment AwardFragment on Award {\n    awardId\n    workId\n    title\n    url\n    category\n    role\n    prizeStatement\n    awardOrdinal\n  }\n": types.AwardFragmentFragmentDoc,
    "\n  fragment BiographyFragment on Biography {\n    biographyId\n    canonical\n    content\n    localeCode\n    contributionId\n  }\n": types.BiographyFragmentFragmentDoc,
    "\n  fragment BookReviewFragment on BookReview {\n    bookReviewId\n    workId\n    title\n    authorName\n    url\n    doi\n    reviewDate\n    journalName\n    journalVolume\n    journalNumber\n    journalIssn\n    text\n    reviewOrdinal\n  }\n": types.BookReviewFragmentFragmentDoc,
    "\n  fragment ContributionFragment on Contribution {\n    workId\n    contributionId\n    mainContribution\n    fullName\n    lastName\n    firstName\n    contributionType\n    contributionOrdinal\n    biographies {\n      ...BiographyFragment\n    }\n    contributor {\n      ...ContributorFragment\n    }\n    contributorId\n    affiliations {\n      ...AffiliationFragment\n    }\n  }\n": types.ContributionFragmentFragmentDoc,
    "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n": types.ContributorFragmentFragmentDoc,
    "\n  fragment EndorsementFragment on Endorsement {\n    endorsementId\n    workId\n    authorName\n    authorRole\n    url\n    text\n    endorsementOrdinal\n  }\n": types.EndorsementFragmentFragmentDoc,
    "\n  fragment WorkFeaturedVideoFragment on WorkFeaturedVideo {\n    workFeaturedVideoId\n    workId\n    title\n    url\n    width\n    height\n  }\n": types.WorkFeaturedVideoFragmentFragmentDoc,
    "\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n": types.FundingFragmentFragmentDoc,
    "\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n  }\n": types.LanguageFragmentFragmentDoc,
    "\n  fragment LocationFragment on Location {\n    canonical\n    fullTextUrl\n    landingPage\n    locationPlatform\n    locationId\n  }\n": types.LocationFragmentFragmentDoc,
    "\n  fragment PriceFragment on Price {\n    unitPrice\n    priceId\n    currencyCode\n  }\n": types.PriceFragmentFragmentDoc,
    "\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n    file {\n      cdnUrl\n    }\n  }\n": types.PublicationFragmentFragmentDoc,
    "\n  fragment PublisherFragment on Publisher {\n    publisherId\n    publisherName\n    publisherShortname\n    publisherUrl\n    updatedAt\n    accessibilityReportUrl\n    accessibilityStatement\n    contacts {\n      contactId\n      contactType\n      email\n    }\n  }\n": types.PublisherFragmentFragmentDoc,
    "\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n": types.ReferenceFragmentFragmentDoc,
    "\n  fragment SetFragment on Work {\n    workId\n    workType\n    workStatus\n    updatedAt\n    imprintId\n    edition\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n      relationOrdinal\n      relatedWork {\n        coverUrl\n      }\n    }\n  }\n": types.SetFragmentFragmentDoc,
    "\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n": types.SubjectFragmentFragmentDoc,
    "\n  fragment TitleFragment on Title {\n    canonical\n    fullTitle\n    localeCode\n    subtitle\n    title\n    titleId\n  }\n": types.TitleFragmentFragmentDoc,
    "\n  fragment WorkFragment on Work {\n    doi\n    lccn\n    oclc\n    workId\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    abstracts(markupFormat: $markupFormat) {\n      abstractId\n      abstractType\n      canonical\n      content\n      localeCode\n    }\n    bibliographyNote\n    generalNote\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    place\n    imprint {\n      imprintName\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    firstPage\n    lastPage\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biographies(markupFormat: $markupFormat) {\n        biographyId\n        canonical\n        content\n        localeCode\n        contributionId\n      }\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      accessibilityAdditionalStandard\n      accessibilityException\n      accessibilityReportUrl\n      accessibilityStandard\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n      file {\n        cdnUrl\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n    awards {\n      awardId\n      workId\n      title\n      url\n      category\n      role\n      prizeStatement\n      awardOrdinal\n    }\n    additionalResources {\n      workResourceId\n      workId\n      title\n      description\n      attribution\n      resourceType\n      doi\n      handle\n      url\n      resourceOrdinal\n    }\n    bookReviews {\n      bookReviewId\n      workId\n      title\n      authorName\n      url\n      doi\n      reviewDate\n      journalName\n      journalVolume\n      journalNumber\n      journalIssn\n      text\n      reviewOrdinal\n    }\n    endorsements {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n    featuredVideo {\n      workFeaturedVideoId\n      workId\n      title\n      url\n      width\n      height\n    }\n  }\n": types.WorkFragmentFragmentDoc,
    "\n  mutation InitFrontcoverFileUpload($data: NewFrontcoverFileUpload!) {\n    initFrontcoverFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n": types.InitFrontcoverFileUploadDocument,
    "\n  mutation InitPublicationFileUpload($data: NewPublicationFileUpload!) {\n    initPublicationFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n": types.InitPublicationFileUploadDocument,
    "\n  mutation CompleteFileUpload($data: CompleteFileUpload!) {\n    completeFileUpload(data: $data) {\n      fileId\n      fileType\n      mimeType\n      bytes\n      objectKey\n      cdnUrl\n    }\n  }\n": types.CompleteFileUploadDocument,
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
export function graphql(source: "\n  mutation CreateAbstract($data: NewAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    createAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAbstract($data: NewAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    createAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAbstract($data: PatchAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAbstract($data: PatchAbstract!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateAbstract(data: $data, markupFormat: $markupFormat) {\n      ...AbstractFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteAbstract($abstractId: Uuid!) {\n    deleteAbstract(abstractId: $abstractId) {\n      abstractId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteAbstract($abstractId: Uuid!) {\n    deleteAbstract(abstractId: $abstractId) {\n      abstractId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAdditionalResource($data: NewAdditionalResource!, $markupFormat: MarkupFormat) {\n    createAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAdditionalResource($data: NewAdditionalResource!, $markupFormat: MarkupFormat) {\n    createAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAdditionalResource($data: PatchAdditionalResource!, $markupFormat: MarkupFormat) {\n    updateAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAdditionalResource($data: PatchAdditionalResource!, $markupFormat: MarkupFormat) {\n    updateAdditionalResource(data: $data, markupFormat: $markupFormat) {\n      ...WorkResourceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteAdditionalResource($additionalResourceId: Uuid!) {\n    deleteAdditionalResource(additionalResourceId: $additionalResourceId) {\n      ...WorkResourceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteAdditionalResource($additionalResourceId: Uuid!) {\n    deleteAdditionalResource(additionalResourceId: $additionalResourceId) {\n      ...WorkResourceFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveAdditionalResource($additionalResourceId: Uuid!, $newOrdinal: Int!) {\n    moveAdditionalResource(additionalResourceId: $additionalResourceId, newOrdinal: $newOrdinal) {\n      ...WorkResourceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation MoveAdditionalResource($additionalResourceId: Uuid!, $newOrdinal: Int!) {\n    moveAdditionalResource(additionalResourceId: $additionalResourceId, newOrdinal: $newOrdinal) {\n      ...WorkResourceFragment\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation MoveAffiliation($affiliationId: Uuid!, $newOrdinal: Int!) {\n    moveAffiliation(affiliationId: $affiliationId, newOrdinal: $newOrdinal) {\n      ...AffiliationFragment\n    }\n  }\n"): (typeof documents)["\n  mutation MoveAffiliation($affiliationId: Uuid!, $newOrdinal: Int!) {\n    moveAffiliation(affiliationId: $affiliationId, newOrdinal: $newOrdinal) {\n      ...AffiliationFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAward($data: NewAward!, $markupFormat: MarkupFormat) {\n    createAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAward($data: NewAward!, $markupFormat: MarkupFormat) {\n    createAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAward($data: PatchAward!, $markupFormat: MarkupFormat) {\n    updateAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAward($data: PatchAward!, $markupFormat: MarkupFormat) {\n    updateAward(data: $data, markupFormat: $markupFormat) {\n      ...AwardFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteAward($awardId: Uuid!) {\n    deleteAward(awardId: $awardId) {\n      ...AwardFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteAward($awardId: Uuid!) {\n    deleteAward(awardId: $awardId) {\n      ...AwardFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveAward($awardId: Uuid!, $newOrdinal: Int!) {\n    moveAward(awardId: $awardId, newOrdinal: $newOrdinal) {\n      ...AwardFragment\n    }\n  }\n"): (typeof documents)["\n  mutation MoveAward($awardId: Uuid!, $newOrdinal: Int!) {\n    moveAward(awardId: $awardId, newOrdinal: $newOrdinal) {\n      ...AwardFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateBookReview($data: NewBookReview!, $markupFormat: MarkupFormat) {\n    createBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateBookReview($data: NewBookReview!, $markupFormat: MarkupFormat) {\n    createBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateBookReview($data: PatchBookReview!, $markupFormat: MarkupFormat) {\n    updateBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateBookReview($data: PatchBookReview!, $markupFormat: MarkupFormat) {\n    updateBookReview(data: $data, markupFormat: $markupFormat) {\n      ...BookReviewFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteBookReview($bookReviewId: Uuid!) {\n    deleteBookReview(bookReviewId: $bookReviewId) {\n      ...BookReviewFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteBookReview($bookReviewId: Uuid!) {\n    deleteBookReview(bookReviewId: $bookReviewId) {\n      ...BookReviewFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveBookReview($bookReviewId: Uuid!, $newOrdinal: Int!) {\n    moveBookReview(bookReviewId: $bookReviewId, newOrdinal: $newOrdinal) {\n      ...BookReviewFragment\n    }\n  }\n"): (typeof documents)["\n  mutation MoveBookReview($bookReviewId: Uuid!, $newOrdinal: Int!) {\n    moveBookReview(bookReviewId: $bookReviewId, newOrdinal: $newOrdinal) {\n      ...BookReviewFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetBooks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $filter: String\n    $workStatus: WorkStatus\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $updatedAtWithRelations: TimeExpression\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    books(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n    ) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n    $publicationDate: TimeExpression\n    $workStatuses: [WorkStatus!]\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n      publicationDate: $publicationDate\n      workStatuses: $workStatuses\n    )\n  }\n"): (typeof documents)["\n  query GetBooksCount(\n    $publishers: [Uuid!]!\n    $filter: String\n    $workStatus: WorkStatus\n    $updatedAtWithRelations: TimeExpression\n    $publicationDate: TimeExpression\n    $workStatuses: [WorkStatus!]\n  ) {\n    bookCount(\n      publishers: $publishers\n      filter: $filter\n      workStatus: $workStatus\n      updatedAtWithRelations: $updatedAtWithRelations\n      publicationDate: $publicationDate\n      workStatuses: $workStatuses\n    )\n  }\n"];
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
export function graphql(source: "\n  mutation MoveContribution($contributionId: Uuid!, $newOrdinal: Int!) {\n    moveContribution(contributionId: $contributionId, newOrdinal: $newOrdinal) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation MoveContribution($contributionId: Uuid!, $newOrdinal: Int!) {\n    moveContribution(contributionId: $contributionId, newOrdinal: $newOrdinal) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateBiography($data: NewBiography!, $markupFormat: MarkupFormat!) {\n    createBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateBiography($data: NewBiography!, $markupFormat: MarkupFormat!) {\n    createBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateBiography($data: PatchBiography!, $markupFormat: MarkupFormat!) {\n    updateBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateBiography($data: PatchBiography!, $markupFormat: MarkupFormat!) {\n    updateBiography(data: $data, markupFormat: $markupFormat) {\n      ...BiographyFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteBiography($biographyId: Uuid!) {\n    deleteBiography(biographyId: $biographyId) {\n      ...BiographyFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteBiography($biographyId: Uuid!) {\n    deleteBiography(biographyId: $biographyId) {\n      ...BiographyFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetContributionBiographies($contributionId: Uuid!) {\n    contribution(contributionId: $contributionId) {\n      biographies {\n        ...BiographyFragment\n        contributionId\n        work {\n          workId\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetContributionBiographies($contributionId: Uuid!) {\n    contribution(contributionId: $contributionId) {\n      biographies {\n        ...BiographyFragment\n        contributionId\n        work {\n          workId\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n      contributions(order: { field: UPDATED_AT, direction: DESC }, limit: 1) {\n        work {\n          title\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetContributors($filter: String) {\n    contributors(filter: $filter) {\n      orcid\n      fullName\n      lastName\n      updatedAt\n      contributorId\n      contributions(order: { field: UPDATED_AT, direction: DESC }, limit: 1) {\n        work {\n          title\n        }\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation CreateEndorsement($markupFormat: MarkupFormat, $data: NewEndorsement!) {\n    createEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"): (typeof documents)["\n  mutation CreateEndorsement($markupFormat: MarkupFormat, $data: NewEndorsement!) {\n    createEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateEndorsement($markupFormat: MarkupFormat, $data: PatchEndorsement!) {\n    updateEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateEndorsement($markupFormat: MarkupFormat, $data: PatchEndorsement!) {\n    updateEndorsement(markupFormat: $markupFormat, data: $data) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteEndorsement($endorsementId: Uuid!) {\n    deleteEndorsement(endorsementId: $endorsementId) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteEndorsement($endorsementId: Uuid!) {\n    deleteEndorsement(endorsementId: $endorsementId) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveEndorsement($endorsementId: Uuid!, $newOrdinal: Int!) {\n    moveEndorsement(endorsementId: $endorsementId, newOrdinal: $newOrdinal) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"): (typeof documents)["\n  mutation MoveEndorsement($endorsementId: Uuid!, $newOrdinal: Int!) {\n    moveEndorsement(endorsementId: $endorsementId, newOrdinal: $newOrdinal) {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkFeaturedVideo($data: NewWorkFeaturedVideo!) {\n    createWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkFeaturedVideo($data: NewWorkFeaturedVideo!) {\n    createWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWorkFeaturedVideo($data: PatchWorkFeaturedVideo!) {\n    updateWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateWorkFeaturedVideo($data: PatchWorkFeaturedVideo!) {\n    updateWorkFeaturedVideo(data: $data) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorkFeaturedVideo($workFeaturedVideoId: Uuid!) {\n    deleteWorkFeaturedVideo(workFeaturedVideoId: $workFeaturedVideoId) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteWorkFeaturedVideo($workFeaturedVideoId: Uuid!) {\n    deleteWorkFeaturedVideo(workFeaturedVideoId: $workFeaturedVideoId) {\n      ...WorkFeaturedVideoFragment\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation CreateImprint($data: NewImprint!) {\n    createImprint(data: $data) {\n      imprintId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateImprint($data: NewImprint!) {\n    createImprint(data: $data) {\n      imprintId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateImprint($data: PatchImprint!) {\n    updateImprint(data: $data) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateImprint($data: PatchImprint!) {\n    updateImprint(data: $data) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteImprint($imprintId: Uuid!) {\n    deleteImprint(imprintId: $imprintId) {\n      imprintId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteImprint($imprintId: Uuid!) {\n    deleteImprint(imprintId: $imprintId) {\n      imprintId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n"): (typeof documents)["\n  query GetImprintsCount($publishers: [Uuid!]!) {\n    imprintCount(publishers: $publishers)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetImprints($offset: Int!, $limit: Int, $publishers: [Uuid!]!) {\n    imprints(offset: $offset, limit: $limit, publishers: $publishers) {\n      imprintId\n      imprintName\n      imprintUrl\n      updatedAt\n      crossmarkDoi\n      defaultCurrency\n      defaultLocale\n      defaultPlace\n      publisher {\n        publisherName\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetPublications($publishers: [Uuid!]!) {\n    publications(publishers: $publishers) {\n      isbn\n      publicationId\n      publicationType\n      updatedAt\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePublication($data: NewPublication!) {\n    createPublication(data: $data) {\n      publicationId\n      work {\n        doi\n        titles {\n          canonical\n          fullTitle\n          localeCode\n          subtitle\n          title\n          titleId\n        }\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation CreateContact($data: NewContact!) {\n    createContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n"): (typeof documents)["\n  mutation CreateContact($data: NewContact!) {\n    createContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateContact($data: PatchContact!) {\n    updateContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateContact($data: PatchContact!) {\n    updateContact(data: $data) {\n      contactId\n      contactType\n      email\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteContact($contactId: Uuid!) {\n    deleteContact(contactId: $contactId) {\n      contactId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteContact($contactId: Uuid!) {\n    deleteContact(contactId: $contactId) {\n      contactId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePublisher($data: NewPublisher!) {\n    createPublisher(data: $data) {\n      publisherId\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePublisher($data: NewPublisher!) {\n    createPublisher(data: $data) {\n      publisherId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      ...PublisherFragment\n    }\n  }\n"): (typeof documents)["\n  query GetPublishers($publishers: [Uuid!]!, $offset: Int!, $limit: Int) {\n    publishers(publishers: $publishers, offset: $offset, limit: $limit) {\n      ...PublisherFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetPublisher($publisherId: Uuid!) {\n    publisher(publisherId: $publisherId) {\n      ...PublisherFragment\n    }\n  }\n"): (typeof documents)["\n  query GetPublisher($publisherId: Uuid!) {\n    publisher(publisherId: $publisherId) {\n      ...PublisherFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePublisher($data: PatchPublisher!) {\n    updatePublisher(data: $data) {\n      ...PublisherFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePublisher($data: PatchPublisher!) {\n    updatePublisher(data: $data) {\n      ...PublisherFragment\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation MoveReference($referenceId: Uuid!, $newOrdinal: Int!) {\n    moveReference(referenceId: $referenceId, newOrdinal: $newOrdinal) {\n      ...ReferenceFragment\n    }\n  }\n"): (typeof documents)["\n  mutation MoveReference($referenceId: Uuid!, $newOrdinal: Int!) {\n    moveReference(referenceId: $referenceId, newOrdinal: $newOrdinal) {\n      ...ReferenceFragment\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation MoveIssue($issueId: Uuid!, $newOrdinal: Int!) {\n    moveIssue(issueId: $issueId, newOrdinal: $newOrdinal) {\n      issueId\n    }\n  }\n"): (typeof documents)["\n  mutation MoveIssue($issueId: Uuid!, $newOrdinal: Int!) {\n    moveIssue(issueId: $issueId, newOrdinal: $newOrdinal) {\n      issueId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetSerieses(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: SeriesField = UPDATED_AT\n    $seriesTypes: [SeriesType!]\n  ) {\n    serieses(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      seriesTypes: $seriesTypes\n    ) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSeriesCount($publishers: [Uuid!]!, $filter: String) {\n    seriesCount(publishers: $publishers, filter: $filter)\n  }\n"): (typeof documents)["\n  query GetSeriesCount($publishers: [Uuid!]!, $filter: String) {\n    seriesCount(publishers: $publishers, filter: $filter)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetSeries($seriesId: Uuid!) {\n    series(seriesId: $seriesId) {\n      seriesId\n      seriesName\n      seriesType\n      issnPrint\n      issnDigital\n      updatedAt\n      imprintId\n      imprint {\n        imprintName\n      }\n      seriesUrl\n      seriesDescription\n      issues {\n        issueId\n        issueOrdinal\n        work {\n          workId\n          title\n          coverUrl\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSet($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...SetFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSet($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...SetFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSet($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...SetFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSet($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...SetFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteWork($workId: Uuid!) {\n    deleteWork(workId: $workId) {\n      workId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {\n    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {\n      workRelationId\n    }\n  }\n"): (typeof documents)["\n  mutation MoveWorkRelation($workRelationId: Uuid!, $newOrdinal: Int!) {\n    moveWorkRelation(workRelationId: $workRelationId, newOrdinal: $newOrdinal) {\n      workRelationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddBookToSet($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n"): (typeof documents)["\n  mutation AddBookToSet($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteBookFromSet($workRelationId: Uuid!) {\n    deleteWorkRelation(workRelationId: $workRelationId) {\n      workRelationId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteBookFromSet($workRelationId: Uuid!) {\n    deleteWorkRelation(workRelationId: $workRelationId) {\n      workRelationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSets(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      workTypes: [BOOK_SET]\n    ) {\n      ...SetFragment\n    }\n  }\n"): (typeof documents)["\n  query GetSets(\n    $publishers: [Uuid!]!\n    $filter: String\n    $offset: Int\n    $limit: Int\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      publishers: $publishers\n      filter: $filter\n      offset: $offset\n      limit: $limit\n      order: { direction: $direction, field: $field }\n      workTypes: [BOOK_SET]\n    ) {\n      ...SetFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSet($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...SetFragment\n    }\n  }\n"): (typeof documents)["\n  query GetSet($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...SetFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSetsCount($publishers: [Uuid!]!, $filter: String) {\n    workCount(publishers: $publishers, workTypes: [BOOK_SET], filter: $filter)\n  }\n"): (typeof documents)["\n  query GetSetsCount($publishers: [Uuid!]!, $filter: String) {\n    workCount(publishers: $publishers, workTypes: [BOOK_SET], filter: $filter)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBookSetWorks($setId: Uuid!, $markupFormat: MarkupFormat = PLAIN_TEXT) {\n    work(workId: $setId) {\n      relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n        relationOrdinal\n        workRelationId\n        relatedWorkId\n        relatedWork {\n          titles(markupFormat: $markupFormat) {\n            canonical\n            fullTitle\n            localeCode\n            subtitle\n            title\n            titleId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetBookSetWorks($setId: Uuid!, $markupFormat: MarkupFormat = PLAIN_TEXT) {\n    work(workId: $setId) {\n      relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n        relationOrdinal\n        workRelationId\n        relatedWorkId\n        relatedWork {\n          titles(markupFormat: $markupFormat) {\n            canonical\n            fullTitle\n            localeCode\n            subtitle\n            title\n            titleId\n          }\n        }\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation MoveSubject($subjectId: Uuid!, $newOrdinal: Int!) {\n    moveSubject(subjectId: $subjectId, newOrdinal: $newOrdinal) {\n      subjectId\n    }\n  }\n"): (typeof documents)["\n  mutation MoveSubject($subjectId: Uuid!, $newOrdinal: Int!) {\n    moveSubject(subjectId: $subjectId, newOrdinal: $newOrdinal) {\n      subjectId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTitle($data: NewTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    createTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTitle($data: NewTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    createTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTitle($data: PatchTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTitle($data: PatchTitle!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateTitle(data: $data, markupFormat: $markupFormat) {\n      ...TitleFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTitle($titleId: Uuid!) {\n    deleteTitle(titleId: $titleId) {\n      titleId\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteTitle($titleId: Uuid!) {\n    deleteTitle(titleId: $titleId) {\n      titleId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetUser {\n    me {\n      userId\n      email\n      firstName\n      lastName\n      isSuperuser\n      publisherContexts {\n        publisher {\n          publisherName\n          publisherId\n          imprints {\n            imprintId\n            imprintName\n            imprintUrl\n            updatedAt\n            crossmarkDoi\n            defaultCurrency\n            defaultLocale\n            defaultPlace\n          }\n        }\n        permissions {\n          publisherAdmin\n          workLifecycle\n          cdnWrite\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetUser {\n    me {\n      userId\n      email\n      firstName\n      lastName\n      isSuperuser\n      publisherContexts {\n        publisher {\n          publisherName\n          publisherId\n          imprints {\n            imprintId\n            imprintName\n            imprintUrl\n            updatedAt\n            crossmarkDoi\n            defaultCurrency\n            defaultLocale\n            defaultPlace\n          }\n        }\n        permissions {\n          publisherAdmin\n          workLifecycle\n          cdnWrite\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWork($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWork($data: NewWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    createWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetWorks(\n    $offset: Int!\n    $limit: Int\n    $publishers: [Uuid!]!\n    $direction: Direction = ASC\n    $field: WorkField = UPDATED_AT_WITH_RELATIONS\n    $workStatus: WorkStatus\n    $filter: String\n    $workTypes: [WorkType!]\n    $markupFormat: MarkupFormat = JATS_XML\n  ) {\n    works(\n      offset: $offset\n      limit: $limit\n      publishers: $publishers\n      order: { direction: $direction, field: $field }\n      workStatus: $workStatus\n      filter: $filter\n      workTypes: $workTypes\n    ) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWork($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  query GetWork($workId: Uuid!, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWork($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateWork($data: PatchWork!, $markupFormat: MarkupFormat = JATS_XML) {\n    updateWork(data: $data) {\n      ...WorkFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n"): (typeof documents)["\n  query GetWorksCount($publishers: [Uuid!]!, $filter: String, $workStatus: WorkStatus, $workTypes: [WorkType!]) {\n    workCount(publishers: $publishers, filter: $filter, workStatus: $workStatus, workTypes: $workTypes)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkChapters($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_CHILD\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkChapters($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_CHILD\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkTranslations($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_TRANSLATION\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkTranslations($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: HAS_TRANSLATION\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_REPLACED_BY\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_REPLACED_BY\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkPrevEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: REPLACES\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkPrevEditions($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: REPLACES\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTranslatedWorks($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_TRANSLATION_OF\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetTranslatedWorks($workId: Uuid!, $limit: Int, $offset: Int, $markupFormat: MarkupFormat = JATS_XML) {\n    work(workId: $workId) {\n      relations(\n        relationTypes: IS_TRANSLATION_OF\n        limit: $limit\n        offset: $offset\n        order: { direction: ASC, field: RELATION_ORDINAL }\n      ) {\n        workRelationId\n        relatedWork {\n          ...WorkFragment\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkRelation($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkRelation($data: NewWorkRelation!) {\n    createWorkRelation(data: $data) {\n      workRelationId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetWorkSet($workId: Uuid!) {\n    work(workId: $workId) {\n      relations(relationTypes: IS_PART_OF) {\n        workRelationId\n        relatedWork {\n          titles(markupFormat: PLAIN_TEXT) {\n            ...TitleFragment\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetWorkSet($workId: Uuid!) {\n    work(workId: $workId) {\n      relations(relationTypes: IS_PART_OF) {\n        workRelationId\n        relatedWork {\n          titles(markupFormat: PLAIN_TEXT) {\n            ...TitleFragment\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AbstractFragment on Abstract {\n    abstractId\n    abstractType\n    canonical\n    content\n    localeCode\n  }\n"): (typeof documents)["\n  fragment AbstractFragment on Abstract {\n    abstractId\n    abstractType\n    canonical\n    content\n    localeCode\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WorkResourceFragment on WorkResource {\n    workResourceId\n    workId\n    title\n    description\n    attribution\n    resourceType\n    doi\n    handle\n    url\n    resourceOrdinal\n  }\n"): (typeof documents)["\n  fragment WorkResourceFragment on WorkResource {\n    workResourceId\n    workId\n    title\n    description\n    attribution\n    resourceType\n    doi\n    handle\n    url\n    resourceOrdinal\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n"): (typeof documents)["\n  fragment AffiliationFragment on Affiliation {\n    contributionId\n    affiliationId\n    institutionId\n    institution {\n      institutionName\n      ror\n    }\n    affiliationOrdinal\n    position\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AwardFragment on Award {\n    awardId\n    workId\n    title\n    url\n    category\n    role\n    prizeStatement\n    awardOrdinal\n  }\n"): (typeof documents)["\n  fragment AwardFragment on Award {\n    awardId\n    workId\n    title\n    url\n    category\n    role\n    prizeStatement\n    awardOrdinal\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BiographyFragment on Biography {\n    biographyId\n    canonical\n    content\n    localeCode\n    contributionId\n  }\n"): (typeof documents)["\n  fragment BiographyFragment on Biography {\n    biographyId\n    canonical\n    content\n    localeCode\n    contributionId\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BookReviewFragment on BookReview {\n    bookReviewId\n    workId\n    title\n    authorName\n    url\n    doi\n    reviewDate\n    journalName\n    journalVolume\n    journalNumber\n    journalIssn\n    text\n    reviewOrdinal\n  }\n"): (typeof documents)["\n  fragment BookReviewFragment on BookReview {\n    bookReviewId\n    workId\n    title\n    authorName\n    url\n    doi\n    reviewDate\n    journalName\n    journalVolume\n    journalNumber\n    journalIssn\n    text\n    reviewOrdinal\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ContributionFragment on Contribution {\n    workId\n    contributionId\n    mainContribution\n    fullName\n    lastName\n    firstName\n    contributionType\n    contributionOrdinal\n    biographies {\n      ...BiographyFragment\n    }\n    contributor {\n      ...ContributorFragment\n    }\n    contributorId\n    affiliations {\n      ...AffiliationFragment\n    }\n  }\n"): (typeof documents)["\n  fragment ContributionFragment on Contribution {\n    workId\n    contributionId\n    mainContribution\n    fullName\n    lastName\n    firstName\n    contributionType\n    contributionOrdinal\n    biographies {\n      ...BiographyFragment\n    }\n    contributor {\n      ...ContributorFragment\n    }\n    contributorId\n    affiliations {\n      ...AffiliationFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n"): (typeof documents)["\n  fragment ContributorFragment on Contributor {\n    contributorId\n    firstName\n    fullName\n    lastName\n    updatedAt\n    orcid\n    website\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment EndorsementFragment on Endorsement {\n    endorsementId\n    workId\n    authorName\n    authorRole\n    url\n    text\n    endorsementOrdinal\n  }\n"): (typeof documents)["\n  fragment EndorsementFragment on Endorsement {\n    endorsementId\n    workId\n    authorName\n    authorRole\n    url\n    text\n    endorsementOrdinal\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WorkFeaturedVideoFragment on WorkFeaturedVideo {\n    workFeaturedVideoId\n    workId\n    title\n    url\n    width\n    height\n  }\n"): (typeof documents)["\n  fragment WorkFeaturedVideoFragment on WorkFeaturedVideo {\n    workFeaturedVideoId\n    workId\n    title\n    url\n    width\n    height\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n"): (typeof documents)["\n  fragment FundingFragment on Funding {\n    fundingId\n    grantNumber\n    institutionId\n    program\n    projectName\n    projectShortname\n    institution {\n      institutionName\n      ror\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n  }\n"): (typeof documents)["\n  fragment LanguageFragment on Language {\n    languageId\n    languageCode\n    languageRelation\n  }\n"];
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
export function graphql(source: "\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n    file {\n      cdnUrl\n    }\n  }\n"): (typeof documents)["\n  fragment PublicationFragment on Publication {\n    publicationId\n    isbn\n    publicationType\n    updatedAt\n    weight(units: G)\n    width(units: MM)\n    height(units: MM)\n    depth(units: MM)\n    work {\n      doi\n      title\n      imprint {\n        publisher {\n          publisherName\n        }\n      }\n    }\n    file {\n      cdnUrl\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PublisherFragment on Publisher {\n    publisherId\n    publisherName\n    publisherShortname\n    publisherUrl\n    updatedAt\n    accessibilityReportUrl\n    accessibilityStatement\n    contacts {\n      contactId\n      contactType\n      email\n    }\n  }\n"): (typeof documents)["\n  fragment PublisherFragment on Publisher {\n    publisherId\n    publisherName\n    publisherShortname\n    publisherUrl\n    updatedAt\n    accessibilityReportUrl\n    accessibilityStatement\n    contacts {\n      contactId\n      contactType\n      email\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n"): (typeof documents)["\n  fragment ReferenceFragment on Reference {\n    doi\n    referenceId\n    referenceOrdinal\n    unstructuredCitation\n    journalTitle\n    articleTitle\n    seriesTitle\n    volumeTitle\n    url\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment SetFragment on Work {\n    workId\n    workType\n    workStatus\n    updatedAt\n    imprintId\n    edition\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n      relationOrdinal\n      relatedWork {\n        coverUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment SetFragment on Work {\n    workId\n    workType\n    workStatus\n    updatedAt\n    imprintId\n    edition\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    relations(relationTypes: HAS_PART, order: { field: WORK_RELATION_ID, direction: DESC }) {\n      relationOrdinal\n      relatedWork {\n        coverUrl\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n"): (typeof documents)["\n  fragment SubjectFragment on Subject {\n    subjectId\n    subjectCode\n    subjectType\n    subjectOrdinal\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TitleFragment on Title {\n    canonical\n    fullTitle\n    localeCode\n    subtitle\n    title\n    titleId\n  }\n"): (typeof documents)["\n  fragment TitleFragment on Title {\n    canonical\n    fullTitle\n    localeCode\n    subtitle\n    title\n    titleId\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WorkFragment on Work {\n    doi\n    lccn\n    oclc\n    workId\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    abstracts(markupFormat: $markupFormat) {\n      abstractId\n      abstractType\n      canonical\n      content\n      localeCode\n    }\n    bibliographyNote\n    generalNote\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    place\n    imprint {\n      imprintName\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    firstPage\n    lastPage\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biographies(markupFormat: $markupFormat) {\n        biographyId\n        canonical\n        content\n        localeCode\n        contributionId\n      }\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      accessibilityAdditionalStandard\n      accessibilityException\n      accessibilityReportUrl\n      accessibilityStandard\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n      file {\n        cdnUrl\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n    awards {\n      awardId\n      workId\n      title\n      url\n      category\n      role\n      prizeStatement\n      awardOrdinal\n    }\n    additionalResources {\n      workResourceId\n      workId\n      title\n      description\n      attribution\n      resourceType\n      doi\n      handle\n      url\n      resourceOrdinal\n    }\n    bookReviews {\n      bookReviewId\n      workId\n      title\n      authorName\n      url\n      doi\n      reviewDate\n      journalName\n      journalVolume\n      journalNumber\n      journalIssn\n      text\n      reviewOrdinal\n    }\n    endorsements {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n    featuredVideo {\n      workFeaturedVideoId\n      workId\n      title\n      url\n      width\n      height\n    }\n  }\n"): (typeof documents)["\n  fragment WorkFragment on Work {\n    doi\n    lccn\n    oclc\n    workId\n    titles(markupFormat: $markupFormat) {\n      canonical\n      fullTitle\n      localeCode\n      subtitle\n      title\n      titleId\n    }\n    abstracts(markupFormat: $markupFormat) {\n      abstractId\n      abstractType\n      canonical\n      content\n      localeCode\n    }\n    bibliographyNote\n    generalNote\n    workType\n    updatedAt\n    publicationDate\n    withdrawnDate\n    place\n    imprint {\n      imprintName\n      publisher {\n        publisherName\n      }\n    }\n    reference\n    imprintId\n    workStatus\n    edition\n    license\n    copyrightHolder\n    landingPage\n    coverUrl\n    pageCount\n    pageBreakdown\n    imageCount\n    tableCount\n    audioCount\n    videoCount\n    firstPage\n    lastPage\n    contributions {\n      fullName\n      lastName\n      firstName\n      contributionId\n      contributorId\n      contributionType\n      mainContribution\n      contributionOrdinal\n      biographies(markupFormat: $markupFormat) {\n        biographyId\n        canonical\n        content\n        localeCode\n        contributionId\n      }\n      contributor {\n        orcid\n        website\n      }\n      affiliations {\n        position\n        affiliationId\n        affiliationOrdinal\n        institution {\n          ror\n          institutionName\n          institutionId\n        }\n      }\n    }\n    languages {\n      languageCode\n      languageRelation\n      languageId\n    }\n    fundings {\n      fundingId\n      grantNumber\n      institutionId\n      program\n      projectName\n      projectShortname\n      institution {\n        institutionName\n        ror\n      }\n    }\n    publications {\n      publicationId\n      isbn\n      publicationType\n      updatedAt\n      weightG: weight(units: G)\n      weightOz: weight(units: OZ)\n      widthMm: width(units: MM)\n      widthIn: width(units: IN)\n      heightMm: height(units: MM)\n      heightIn: height(units: IN)\n      depthMm: depth(units: MM)\n      depthIn: depth(units: IN)\n      accessibilityAdditionalStandard\n      accessibilityException\n      accessibilityReportUrl\n      accessibilityStandard\n      work {\n        doi\n        title\n        imprint {\n          publisher {\n            publisherName\n          }\n        }\n      }\n      prices {\n        unitPrice\n        priceId\n        currencyCode\n      }\n      locations {\n        canonical\n        fullTextUrl\n        landingPage\n        locationPlatform\n        locationId\n      }\n      file {\n        cdnUrl\n      }\n    }\n    references {\n      doi\n      referenceId\n      referenceOrdinal\n      journalTitle\n      articleTitle\n      seriesTitle\n      volumeTitle\n      unstructuredCitation\n      url\n    }\n    subjects {\n      subjectId\n      subjectCode\n      subjectType\n      subjectOrdinal\n    }\n    issues {\n      issueId\n      issueOrdinal\n      series {\n        seriesId\n        seriesName\n      }\n    }\n    awards {\n      awardId\n      workId\n      title\n      url\n      category\n      role\n      prizeStatement\n      awardOrdinal\n    }\n    additionalResources {\n      workResourceId\n      workId\n      title\n      description\n      attribution\n      resourceType\n      doi\n      handle\n      url\n      resourceOrdinal\n    }\n    bookReviews {\n      bookReviewId\n      workId\n      title\n      authorName\n      url\n      doi\n      reviewDate\n      journalName\n      journalVolume\n      journalNumber\n      journalIssn\n      text\n      reviewOrdinal\n    }\n    endorsements {\n      endorsementId\n      workId\n      authorName\n      authorRole\n      url\n      text\n      endorsementOrdinal\n    }\n    featuredVideo {\n      workFeaturedVideoId\n      workId\n      title\n      url\n      width\n      height\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InitFrontcoverFileUpload($data: NewFrontcoverFileUpload!) {\n    initFrontcoverFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n"): (typeof documents)["\n  mutation InitFrontcoverFileUpload($data: NewFrontcoverFileUpload!) {\n    initFrontcoverFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InitPublicationFileUpload($data: NewPublicationFileUpload!) {\n    initPublicationFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n"): (typeof documents)["\n  mutation InitPublicationFileUpload($data: NewPublicationFileUpload!) {\n    initPublicationFileUpload(data: $data) {\n      fileUploadId\n      uploadUrl\n      uploadHeaders {\n        name\n        value\n      }\n      expiresAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CompleteFileUpload($data: CompleteFileUpload!) {\n    completeFileUpload(data: $data) {\n      fileId\n      fileType\n      mimeType\n      bytes\n      objectKey\n      cdnUrl\n    }\n  }\n"): (typeof documents)["\n  mutation CompleteFileUpload($data: CompleteFileUpload!) {\n    completeFileUpload(data: $data) {\n      fileId\n      fileType\n      mimeType\n      bytes\n      objectKey\n      cdnUrl\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;