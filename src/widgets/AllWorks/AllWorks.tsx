'use client';

import NextLink from 'next/link';

import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { ROUTES } from '@/src/shared';
import { Link } from '@/src/shared/ui';

import useWorks from '../../entities/work/api/hooks/useWorks';

const AllWorks = () => {
  const { activePublisher } = usePublisherStateMachine();
  const { works } = useWorks(activePublisher ? [activePublisher] : []);

  return (
    <ul className="flex flex-col gap-2">
      {works.map(({ id, title, updatedAt, contributorsNames, doi, publisherName }) => (
        <li key={id}>
          <NextLink href={ROUTES.WORK_PAGE(id)} passHref>
            <Link className="flex gap-2">
              <span>{id}</span>
              <span>{title}</span>
              <span>{contributorsNames.join(', ')}</span>
              <span>{doi}</span>
              <span>{publisherName}</span>
              <span>{updatedAt}</span>
            </Link>
          </NextLink>
        </li>
      ))}
    </ul>
  );
};

export default AllWorks;
