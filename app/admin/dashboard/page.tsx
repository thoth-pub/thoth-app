import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { Direction, WorkStatus } from '@/gql/graphql';
import { GET_BOOKS, GET_BOOKS_COUNT } from '@/src/entities/book/model/book.schema';
import { convertLinkedPublishers } from '@/src/shared';
import { ROUTES } from '@/src/shared/constants';
import { PreloadQuery } from '@/src/shared/graphqlClient';
import Dashboard from '@/src/widgets/Dashboard/Dashboard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const activePublisher = linkedPublishers.slice(0, 1);

  return (
    <PreloadQuery
      query={GET_BOOKS}
      variables={{ publishers: activePublisher, limit: 3, direction: Direction.Desc, offset: 0 }}
    >
      <PreloadQuery
        query={GET_BOOKS}
        variables={{
          publishers: activePublisher,
          workStatus: WorkStatus.Active,
          limit: 3,
          direction: Direction.Desc,
          offset: 0,
        }}
      >
        <PreloadQuery
          query={GET_BOOKS_COUNT}
          variables={{
            publishers: activePublisher,
          }}
        >
          <PreloadQuery
            query={GET_BOOKS_COUNT}
            variables={{
              publishers: activePublisher,
              workStatus: WorkStatus.Active,
            }}
          >
            <PreloadQuery
              query={GET_BOOKS_COUNT}
              variables={{
                publishers: activePublisher,
                workStatus: WorkStatus.Forthcoming,
              }}
            >
              <Dashboard />
            </PreloadQuery>
          </PreloadQuery>
        </PreloadQuery>
      </PreloadQuery>
    </PreloadQuery>
  );
}
