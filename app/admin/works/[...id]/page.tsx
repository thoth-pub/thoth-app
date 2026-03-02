// eslint-disable-next-line simple-import-sort/imports
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

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
import { UserService } from '@/src/entities/user';
import { WorkService } from '@/src/entities/work/api/work.service';
import { FileStorage } from '@/src/shared';
import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
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
  const workService = new WorkService({
    token,
    fundingService: new FundingService(token),
    subjectService: new SubjectService(token),
    contributionService: new ContributionService({
      token,
      contributorService: new ContributorService(token),
      affiliationService: new AffiliationService(token),
    }),
    publicationService: new PublicationService({
      token,
      locationService: new LocationService(token),
      priceService: new PriceService(token),
      fileStorage: new FileStorage(token),
    }),
    languageService: new LanguageService(token),
    seriesService: new SeriesService(token),
    referenceService: new ReferenceService(token),
  });
  const userService = new UserService(token);

  const work = await workService.getWork(id);

  if (!work) {
    redirect(ROUTES.NOT_FOUND);
  }

  const userData = await userService.getUser();

  const isUsersImprint = userData.linkedPublishers.some((publisher) =>
    publisher.imprints.some((imprint) => imprint.imprintId === work.imprintId),
  );

  if (!isUsersImprint && !userData.isSuperuser) {
    redirect(ROUTES.NOT_FOUND);
  }

  return <EditWorkWidget workId={id} />;
}
