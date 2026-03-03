'use client';

import { createContext, type ReactNode, use, useMemo } from 'react';

import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { BookService } from '@/src/entities/book/api/book.service';
import { ContributionService } from '@/src/entities/contribution';
import { ContributorService } from '@/src/entities/contributor';
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
import { WorkService } from '@/src/entities/work/api/work.service';

import { useQueryToken } from '../hooks';
import { QueryToken } from '../interfaces';
import { NotificationService } from '../notifications/notification.service';
import { FileStorage, PersistentStorage } from '../services';

type ServicesMap = {
  imprintService: ImprintService;
  bookService: BookService;
  workService: WorkService;
  affiliationService: AffiliationService;
  contributorService: ContributorService;
  contributionService: ContributionService;
  subjectService: SubjectService;
  seriesService: SeriesService;
  setService: SetService;
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
  const imprintService = new ImprintService(token);
  const bookService = new BookService(token);
  const affiliationService = new AffiliationService(token);
  const contributorService = new ContributorService(token);
  const subjectService = new SubjectService(token);
  const seriesService = new SeriesService(token);
  const referenceService = new ReferenceService(token);
  const locationService = new LocationService(token);
  const priceService = new PriceService(token);
  const publisherService = new PublisherService(token);
  const fundingService = new FundingService(token);
  const institutionService = new InstitutionService(token);
  const languageService = new LanguageService(token);
  const notificationService = new NotificationService();
  const metadataService = new MetadataService();
  const userService = new UserService(token);
  const persistentStorage = new PersistentStorage();
  const fileStorage = new FileStorage(token);
  const publicationService = new PublicationService({
    token,
    locationService,
    priceService,
    fileStorage,
  });
  const contributionService = new ContributionService({
    token,
    contributorService,
    affiliationService,
  });
  const titleService = new TitleService(token);
  const abstractService = new AbstractService(token);
  const workService = new WorkService({
    token,
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
  const setService = new SetService({
    token,
    titleService,
  });

  return {
    imprintService,
    bookService,
    workService,
    affiliationService,
    contributorService,
    contributionService,
    subjectService,
    seriesService,
    setService,
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
