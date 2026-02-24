'use client';

import { createContext, type ReactNode, use } from 'react';

import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { BookService } from '@/src/entities/book/api/book.service';
import { ContributionService } from '@/src/entities/contribution';
import { ContributorService } from '@/src/entities/contributor';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { ImprintService } from '@/src/entities/imprint';
import { InstitutionService } from '@/src/entities/institution';
import { LanguageService } from '@/src/entities/language/api/service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { MetadataService } from '@/src/entities/metadata/api/metadata.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { PublisherService } from '@/src/entities/publisher/api/publisher.service';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series';
import { SetService } from '@/src/entities/sets/api/set.service';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { UserService } from '@/src/entities/user';
import { WorkService } from '@/src/entities/work/api/work.service';

import { useQueryToken } from '../hooks';
import { QueryToken } from '../interfaces';
import { NotificationService } from '../notifications/notification.service';
import { PersistentStorage } from '../services';

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
  notificationService: NotificationService;
  metadataService: MetadataService;
  userService: UserService;
  persistentStorage: PersistentStorage;
};

const getDefaultServices = (token: QueryToken): ServicesMap => ({
  imprintService: new ImprintService(token),
  bookService: new BookService(token),
  workService: new WorkService(token),
  affiliationService: new AffiliationService(token),
  contributorService: new ContributorService(token),
  contributionService: new ContributionService(token),
  subjectService: new SubjectService(token),
  seriesService: new SeriesService(token),
  setService: new SetService(token),
  referenceService: new ReferenceService(token),
  publicationService: new PublicationService(token),
  locationService: new LocationService(token),
  priceService: new PriceService(token),
  publisherService: new PublisherService(token),
  fundingService: new FundingService(token),
  institutionService: new InstitutionService(token),
  languageService: new LanguageService(token),
  notificationService: new NotificationService(),
  metadataService: new MetadataService(),
  userService: new UserService(token),
  persistentStorage: new PersistentStorage(),
});

const ServicesContext = createContext({
  ...getDefaultServices(''),
});

export function ServicesProvider({ children }: { children: Readonly<ReactNode> }) {
  const queryToken = useQueryToken();
  const defaultServices = getDefaultServices(queryToken);

  return <ServicesContext value={defaultServices}>{children}</ServicesContext>;
}

export function useServices(): ServicesMap {
  const context = use(ServicesContext);

  return context;
}
