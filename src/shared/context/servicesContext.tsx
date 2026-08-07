'use client';

import { createContext, type ReactNode, use, useMemo } from 'react';

import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AdditionalResourceService } from '@/src/entities/additional-resource/api/additional-resource.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { AwardService } from '@/src/entities/award/api/award.service';
import { BookService } from '@/src/entities/book/api/book.service';
import { BookReviewService } from '@/src/entities/book-review/api/book-review.service';
import { ContributionService } from '@/src/entities/contribution';
import { ContributorService } from '@/src/entities/contributor';
import { EndorsementService } from '@/src/entities/endorsement/api/endorsement.service';
import { FeaturedVideoService } from '@/src/entities/featured-video/api/featured-video.service';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { ImprintService } from '@/src/entities/imprint';
import { InstitutionService } from '@/src/entities/institution';
import { LanguageService } from '@/src/entities/language/api/language.service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { MetadataService } from '@/src/entities/metadata/api/metadata.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { PublisherService } from '@/src/entities/publisher/api/publisher.service';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series';
import { SetService } from '@/src/entities/sets/api/set.service';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { UserService } from '@/src/entities/user';
import { ImportPreflightService } from '@/src/entities/work/api/importPreflight.service';
import { WorkService } from '@/src/entities/work/api/work.service';

import { GraphqlService } from '../api/graphqlService';
import { useQueryToken } from '../hooks';
import { QueryToken } from '../interfaces';
import { NotificationService } from '../notifications/notification.service';
import { FileStorage, PersistentStorage } from '../services';

type ServicesMap = {
  imprintService: ImprintService;
  bookService: BookService;
  workService: WorkService;
  importPreflightService: ImportPreflightService;
  affiliationService: AffiliationService;
  contributorService: ContributorService;
  contributionService: ContributionService;
  subjectService: SubjectService;
  seriesService: SeriesService;
  setService: SetService;
  additionalResourceService: AdditionalResourceService;
  awardService: AwardService;
  bookReviewService: BookReviewService;
  endorsementService: EndorsementService;
  featuredVideoService: FeaturedVideoService;
  referenceService: ReferenceService;
  publicationService: PublicationService;
  locationService: LocationService;
  priceService: PriceService;
  publisherService: PublisherService;
  fundingService: FundingService;
  institutionService: InstitutionService;
  languageService: LanguageService;
  titleService: TitleService;
  abstractService: AbstractService;
  notificationService: NotificationService;
  metadataService: MetadataService;
  userService: UserService;
  persistentStorage: PersistentStorage;
  fileStorage: FileStorage;
};

const getDefaultServices = (token: QueryToken): ServicesMap => {
  const graphqlService = new GraphqlService(token);
  const imprintService = new ImprintService(graphqlService);
  const bookService = new BookService(graphqlService);
  const affiliationService = new AffiliationService(graphqlService);
  const contributorService = new ContributorService(graphqlService);
  const subjectService = new SubjectService(graphqlService);
  const seriesService = new SeriesService(graphqlService);
  const awardService = new AwardService(graphqlService);
  const bookReviewService = new BookReviewService(graphqlService);
  const endorsementService = new EndorsementService(graphqlService);
  const referenceService = new ReferenceService(graphqlService);
  const locationService = new LocationService(graphqlService);
  const priceService = new PriceService(graphqlService);
  const publisherService = new PublisherService(graphqlService);
  const fundingService = new FundingService(graphqlService);
  const institutionService = new InstitutionService(graphqlService);
  const languageService = new LanguageService(graphqlService);
  const notificationService = new NotificationService();
  const metadataService = new MetadataService();
  const userService = new UserService(graphqlService);
  const persistentStorage = new PersistentStorage();
  const fileStorage = new FileStorage(token);
  const additionalResourceService = new AdditionalResourceService({ graphqlService, fileStorage });
  const featuredVideoService = new FeaturedVideoService({ graphqlService, fileStorage });
  const publicationService = new PublicationService({
    graphqlService,
    locationService,
    priceService,
    fileStorage,
  });
  const contributionService = new ContributionService({
    graphqlService,
    contributorService,
    affiliationService,
  });
  const titleService = new TitleService(graphqlService);
  const abstractService = new AbstractService(graphqlService);
  const workService = new WorkService({
    graphqlService,
    fundingService,
    subjectService,
    contributionService,
    publicationService,
    languageService,
    seriesService,
    referenceService,
    titleService,
    abstractService,
  });
  const importPreflightService = new ImportPreflightService(graphqlService);
  const setService = new SetService({
    graphqlService,
    titleService,
  });

  return {
    imprintService,
    bookService,
    workService,
    importPreflightService,
    affiliationService,
    contributorService,
    contributionService,
    subjectService,
    seriesService,
    setService,
    additionalResourceService,
    awardService,
    bookReviewService,
    endorsementService,
    featuredVideoService,
    referenceService,
    publicationService,
    locationService,
    priceService,
    publisherService,
    fundingService,
    institutionService,
    languageService,
    titleService,
    abstractService,
    notificationService,
    metadataService,
    userService,
    persistentStorage,
    fileStorage,
  };
};

const ServicesContext = createContext({
  ...getDefaultServices(''),
});

export function ServicesProvider({ children }: { children: Readonly<ReactNode> }) {
  const queryToken = useQueryToken();
  const defaultServices = useMemo(() => getDefaultServices(queryToken), [queryToken]);

  return <ServicesContext value={defaultServices}>{children}</ServicesContext>;
}

export function useServices(): ServicesMap {
  const context = use(ServicesContext);

  return context;
}
