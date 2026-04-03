'use client';

import NextLink from 'next/link';
import removeMd from 'remove-markdown';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { WorkStatusChip } from '@/src/entities/work';
import type { WorkStatus } from '@/src/entities/work/model/work.types';
import { ROUTES } from '@/src/shared/constants';
import { useIsDesktop } from '@/src/shared/hooks';
import type { TitleEntity } from '@/src/shared/types';
import { ImageWithFallback, TranslatedContent, Typography } from '@/src/shared/ui';
import { convertOptionToString, getMainTitle } from '@/src/shared/utils';

type EditBookLinkProps = {
  titles: TitleEntity[];
  id: string;
  type: string;
  status: WorkStatus;
  contributions: WorkContribution[];
  image?: string;
};

const EditBookLink = ({ titles, id, status, type, image = '', contributions }: EditBookLinkProps) => {
  const convertedType = convertOptionToString(type);

  const isDesktop = useIsDesktop();

  const mainContributor = contributions.find(({ isMain }) => isMain)?.fullName ?? '';

  return (
    <NextLink href={ROUTES.WORK_PAGE(id)}>
      <div className="flex h-full w-full">
        <div className="cover relative h-full shrink-0">
          <ImageWithFallback
            fallback="/placeholder.svg"
            src={image}
            width={isDesktop ? 80 : 70}
            height={isDesktop ? 135 : 100}
            alt="image placeholder"
            className="h-full max-w-[70px] rounded object-cover object-center xl:max-w-[80px]"
          />
        </div>

        <div className="flex grow flex-col justify-between pl-2">
          <div className="flex items-center justify-between">
            <Typography variant="h2" component="h3" className="max-w-[170px] grow truncate 2xl:max-w-[240px]">
              {removeMd(getMainTitle(titles).title)}
            </Typography>
          </div>
          <div className="mt-auto flex flex-col gap-1">
            <Typography className="max-w-[170px] truncate 2xl:max-w-[240px]">{mainContributor}</Typography>
            <div className="flex flex-wrap items-center gap-4 w-full">
              <Typography className="max-w-[100px] flex-1 truncate capitalize">
                <TranslatedContent content={convertOptionToString(convertedType).toLowerCase()} />
              </Typography>
              <WorkStatusChip status={status} />
            </div>
          </div>
        </div>
      </div>
    </NextLink>
  );
};

export default EditBookLink;
