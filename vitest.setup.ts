import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock the servicesContext to prevent service instantiation during module load
vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => ({
    imprintService: { createImprint: vi.fn(), updateImprint: vi.fn(), deleteImprint: vi.fn(), getPublisherImprints: vi.fn() },
    bookService: { book: vi.fn(), books: vi.fn(), booksCount: vi.fn() },
    workService: { work: vi.fn(), works: vi.fn(), worksCount: vi.fn(), chapters: vi.fn(), createWork: vi.fn(), updateWork: vi.fn(), updateWorks: vi.fn(), deleteWork: vi.fn() },
    affiliationService: { createAffiliation: vi.fn(), updateAffiliation: vi.fn(), deleteAffiliation: vi.fn(), moveAffiliation: vi.fn(), moveBulkAffiliation: vi.fn() },
    fundingService: { createFunding: vi.fn(), updateFunding: vi.fn(), deleteFunding: vi.fn() },
    abstractService: { createAbstract: vi.fn(), updateAbstract: vi.fn(), deleteAbstract: vi.fn() },
    languageService: { createLanguage: vi.fn(), updateLanguage: vi.fn(), deleteLanguage: vi.fn(), language: vi.fn() },
    priceService: { createPrice: vi.fn(), updatePrice: vi.fn(), deletePrice: vi.fn() },
    publisherService: { publisher: vi.fn(), createPublisher: vi.fn(), updatePublisher: vi.fn(), createContact: vi.fn(), updateContact: vi.fn(), deleteContact: vi.fn() },
    contributionService: { createContribution: vi.fn(), updateContribution: vi.fn(), deleteContribution: vi.fn(), moveContribution: vi.fn(), createBiography: vi.fn(), updateBiography: vi.fn(), deleteBiography: vi.fn(), contribution: vi.fn(), contributionsBulkUpdate: vi.fn(), contributionsBulkDelete: vi.fn() },
    contributorService: { contributor: vi.fn(), contributors: vi.fn(), createContributor: vi.fn(), updateContributor: vi.fn(), linkedPublishers: vi.fn() },
    subjectService: { createSubject: vi.fn(), updateSubject: vi.fn(), deleteSubject: vi.fn(), moveSubjects: vi.fn() },
    seriesService: { series: vi.fn(), serieses: vi.fn(), seriesesCount: vi.fn(), allUserSerieses: vi.fn(), createSeries: vi.fn(), updateSeries: vi.fn(), deleteSeries: vi.fn(), createIssue: vi.fn(), updateIssue: vi.fn(), deleteIssue: vi.fn(), moveIssue: vi.fn() },
    setService: { set: vi.fn(), sets: vi.fn(), setsCount: vi.fn(), bookSetWorks: vi.fn(), createSet: vi.fn(), updateSet: vi.fn(), deleteSet: vi.fn(), addToSet: vi.fn(), deleteFromSet: vi.fn(), moveSetRelation: vi.fn() },
    publicationService: { createPublication: vi.fn(), updatePublication: vi.fn(), deletePublication: vi.fn(), uploadPublicationFile: vi.fn() },
    endorsementService: { createEndorsement: vi.fn(), updateEndorsement: vi.fn(), deleteEndorsement: vi.fn(), moveEndorsement: vi.fn() },
    awardService: { createAward: vi.fn(), updateAward: vi.fn(), deleteAward: vi.fn(), moveAward: vi.fn() },
    bookReviewService: { createBookReview: vi.fn(), updateBookReview: vi.fn(), deleteBookReview: vi.fn(), moveBookReview: vi.fn() },
    featuredVideoService: { createFeaturedVideo: vi.fn(), updateFeaturedVideo: vi.fn(), deleteFeaturedVideo: vi.fn(), uploadFeaturedVideoFile: vi.fn() },
    additionalResourceService: { createAdditionalResource: vi.fn(), updateAdditionalResource: vi.fn(), deleteAdditionalResource: vi.fn(), moveAdditionalResource: vi.fn(), uploadAdditionalResourceFile: vi.fn() },
    userService: { user: vi.fn() },
    institutionService: { institutions: vi.fn() },
    metadataService: { metaData: vi.fn() },
    locationService: { createLocation: vi.fn(), updateLocation: vi.fn(), deleteLocation: vi.fn() },
    referenceService: { createReference: vi.fn(), updateReference: vi.fn(), deleteReference: vi.fn(), moveReference: vi.fn() },
    titleService: { createTitle: vi.fn(), updateTitle: vi.fn(), deleteTitle: vi.fn() },
  })),
  ServicesProvider: vi.fn(({ children }) => children),
}));

// Mock useActiveLocale to prevent react-i18next errors in Preview component
vi.mock('@/src/shared/hooks/useActiveLocale', () => ({
  default: () => 'en',
}));

// Mock RouteChangeHandler to prevent circular dependency issues
vi.mock('@/src/shared/store/RouteChangeHandler', () => ({ RouteChangeHandler: () => null }));
