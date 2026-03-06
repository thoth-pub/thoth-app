// eslint-disable-next-line simple-import-sort/imports
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { ContributionService } from '@/src/entities/contribution';
import { ContributorService } from '@/src/entities/contributor';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { LanguageService } from '@/src/entities/language/api/language.service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { UserService } from '@/src/entities/user';
import { WorkService } from '@/src/entities/work/api/work.service';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { FileStorage } from '@/src/shared/services';
import { EditWorkWidget } from '@/src/widgets';

type WorksPageParams = Promise<{
  id: string[];
}>;

export default async function WorkPage({ params }: { params: WorksPageParams }) {
  const {
    id: [id],
  } = await params;

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(ROUTES.NOT_FOUND);
  }

  const token = session.accessToken;

  if (!token) {
    redirect(ROUTES.NOT_FOUND);
  }
  const graphqlService = new GraphqlService(token);
  const workService = new WorkService({
    graphqlService,
    fundingService: new FundingService(graphqlService),
    subjectService: new SubjectService(graphqlService),
    contributionService: new ContributionService({
      graphqlService,
      contributorService: new ContributorService(graphqlService),
      affiliationService: new AffiliationService(graphqlService),
    }),
    publicationService: new PublicationService({
      graphqlService,
      locationService: new LocationService(graphqlService),
      priceService: new PriceService(graphqlService),
      fileStorage: new FileStorage(token),
    }),
    languageService: new LanguageService(graphqlService),
    seriesService: new SeriesService(graphqlService),
    referenceService: new ReferenceService(graphqlService),
    titleService: new TitleService(graphqlService),
    abstractService: new AbstractService(graphqlService),
  });
  const userService = new UserService(graphqlService);

  const work = await workService.getWork(id);

  if (!work) {
    redirect(ROUTES.NOT_FOUND);
  }

  const userData = await userService.getUser();

  const isUsersImprint = userData.linkedPublishers.some((publisher) =>
    publisher.imprints.some((imprint) => imprint.id === work.imprintId),
  );

  if (!isUsersImprint && !userData.isSuperuser) {
    redirect(ROUTES.NOT_FOUND);
  }

  return <EditWorkWidget workId={id} />;
}
