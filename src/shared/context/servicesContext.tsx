'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { BookService } from '@/src/entities/book/api/book.service';
import { ContributionService } from '@/src/entities/contribution';
import { ContributorService } from '@/src/entities/contributor';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { ImprintService } from '@/src/entities/imprint';
import { InstitutionService } from '@/src/entities/institution';
import { LanguageService } from '@/src/entities/language/api/service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { PublisherService } from '@/src/entities/publisher/api/publisher.service';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { WorkService } from '@/src/entities/work/api/work.service';

import { NotificationService } from '../notifications/notification.service';

type ServicesMap = {
  imprintService: ImprintService;
  bookService: BookService;
  workService: WorkService;
  affiliationService: AffiliationService;
  contributorService: ContributorService;
  contributionService: ContributionService;
  subjectService: SubjectService;
  seriesService: SeriesService;
  referenceService: ReferenceService;
  publicationService: PublicationService;
  locationService: LocationService;
  priceService: PriceService;
  publisherService: PublisherService;
  fundingService: FundingService;
  institutionService: InstitutionService;
  languageService: LanguageService;
  notificationService: NotificationService;
};

const defaultServices: ServicesMap = {
  imprintService: new ImprintService(),
  bookService: new BookService(),
  workService: new WorkService(),
  affiliationService: new AffiliationService(),
  contributorService: new ContributorService(),
  contributionService: new ContributionService(),
  subjectService: new SubjectService(),
  seriesService: new SeriesService(),
  referenceService: new ReferenceService(),
  publicationService: new PublicationService(),
  locationService: new LocationService(),
  priceService: new PriceService(),
  publisherService: new PublisherService(),
  fundingService: new FundingService(),
  institutionService: new InstitutionService(),
  languageService: new LanguageService(),
  notificationService: new NotificationService(),
};

const ServicesContext = createContext({
  ...defaultServices,
});

export function ServicesProvider({ children }: { children: Readonly<ReactNode> }) {
  return <ServicesContext.Provider value={defaultServices}>{children}</ServicesContext.Provider>;
}

export function useServices(): ServicesMap {
  const context = useContext(ServicesContext);

  return context;
}
