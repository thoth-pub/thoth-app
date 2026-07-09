import { vi } from 'vitest';

export function createMockServices(overrides: Record<string, unknown> = {}) {
  return {
    imprintService: { createImprint: vi.fn(), updateImprint: vi.fn(), deleteImprint: vi.fn(), getPublisherImprints: vi.fn(), ...overrides.imprintService as object },
    bookService: { book: vi.fn(), books: vi.fn(), booksCount: vi.fn(), ...overrides.bookService as object },
    workService: { work: vi.fn(), works: vi.fn(), worksCount: vi.fn(), chapters: vi.fn(), createWork: vi.fn(), updateWork: vi.fn(), updateWorks: vi.fn(), deleteWork: vi.fn(), ...overrides.workService as object },
    affiliationService: { createAffiliation: vi.fn(), updateAffiliation: vi.fn(), deleteAffiliation: vi.fn(), moveAffiliation: vi.fn(), moveBulkAffiliation: vi.fn(), ...overrides.affiliationService as object },
    fundingService: { createFunding: vi.fn(), updateFunding: vi.fn(), deleteFunding: vi.fn(), ...overrides.fundingService as object },
    abstractService: { createAbstract: vi.fn(), updateAbstract: vi.fn(), deleteAbstract: vi.fn(), ...overrides.abstractService as object },
    languageService: { createLanguage: vi.fn(), updateLanguage: vi.fn(), deleteLanguage: vi.fn(), language: vi.fn(), ...overrides.languageService as object },
    priceService: { createPrice: vi.fn(), updatePrice: vi.fn(), deletePrice: vi.fn(), ...overrides.priceService as object },
    publisherService: { publisher: vi.fn(), createPublisher: vi.fn(), updatePublisher: vi.fn(), createContact: vi.fn(), updateContact: vi.fn(), deleteContact: vi.fn(), ...overrides.publisherService as object },
    contributionService: { createContribution: vi.fn(), updateContribution: vi.fn(), deleteContribution: vi.fn(), moveContribution: vi.fn(), createBiography: vi.fn(), updateBiography: vi.fn(), deleteBiography: vi.fn(), contribution: vi.fn(), contributionsBulkUpdate: vi.fn(), contributionsBulkDelete: vi.fn(), ...overrides.contributionService as object },
    contributorService: { contributor: vi.fn(), contributors: vi.fn(), createContributor: vi.fn(), updateContributor: vi.fn(), linkedPublishers: vi.fn(), ...overrides.contributorService as object },
    subjectService: { createSubject: vi.fn(), updateSubject: vi.fn(), deleteSubject: vi.fn(), moveSubjects: vi.fn(), ...overrides.subjectService as object },
    seriesService: { series: vi.fn(), serieses: vi.fn(), seriesesCount: vi.fn(), allUserSerieses: vi.fn(), createSeries: vi.fn(), updateSeries: vi.fn(), deleteSeries: vi.fn(), createIssue: vi.fn(), updateIssue: vi.fn(), deleteIssue: vi.fn(), moveIssue: vi.fn(), ...overrides.seriesService as object },
    setService: { set: vi.fn(), sets: vi.fn(), setsCount: vi.fn(), bookSetWorks: vi.fn(), createSet: vi.fn(), updateSet: vi.fn(), deleteSet: vi.fn(), addToSet: vi.fn(), deleteFromSet: vi.fn(), moveSetRelation: vi.fn(), ...overrides.setService as object },
    publicationService: { createPublication: vi.fn(), updatePublication: vi.fn(), deletePublication: vi.fn(), uploadPublicationFile: vi.fn(), ...overrides.publicationService as object },
    endorsementService: { createEndorsement: vi.fn(), updateEndorsement: vi.fn(), deleteEndorsement: vi.fn(), moveEndorsement: vi.fn(), ...overrides.endorsementService as object },
    awardService: { createAward: vi.fn(), updateAward: vi.fn(), deleteAward: vi.fn(), moveAward: vi.fn(), ...overrides.awardService as object },
    bookReviewService: { createBookReview: vi.fn(), updateBookReview: vi.fn(), deleteBookReview: vi.fn(), moveBookReview: vi.fn(), ...overrides.bookReviewService as object },
    featuredVideoService: { createFeaturedVideo: vi.fn(), updateFeaturedVideo: vi.fn(), deleteFeaturedVideo: vi.fn(), uploadFeaturedVideoFile: vi.fn(), ...overrides.featuredVideoService as object },
    additionalResourceService: { createAdditionalResource: vi.fn(), updateAdditionalResource: vi.fn(), deleteAdditionalResource: vi.fn(), moveAdditionalResource: vi.fn(), uploadAdditionalResourceFile: vi.fn(), ...overrides.additionalResourceService as object },
    userService: { user: vi.fn(), ...overrides.userService as object },
    institutionService: { institutions: vi.fn(), ...overrides.institutionService as object },
    metadataService: { metaData: vi.fn(), ...overrides.metadataService as object },
    locationService: { createLocation: vi.fn(), updateLocation: vi.fn(), deleteLocation: vi.fn(), ...overrides.locationService as object },
    referenceService: { createReference: vi.fn(), updateReference: vi.fn(), deleteReference: vi.fn(), moveReference: vi.fn(), ...overrides.referenceService as object },
    titleService: { createTitle: vi.fn(), updateTitle: vi.fn(), deleteTitle: vi.fn(), ...overrides.titleService as object },
    ...overrides,
  };
}

export type MockRefs = ReturnType<typeof setupMockRefs>;

export function setupMockRefs() {
  const mockServices = createMockServices();
  const mockSendError = vi.fn();
  const mockSendSuccess = vi.fn();
  const mockInvalidate = vi.fn();
  const mockQueryClient = { invalidateQueries: mockInvalidate };
  return { mockServices, mockSendError, mockSendSuccess, mockInvalidate, mockQueryClient };
}