'use client';

import NextLink from 'next/link';
import removeMd from 'remove-markdown';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { WorkStatusChip } from '@/src/entities/work';
import type { WorkStatus } from '@/src/entities/work/model/work.types';
import { convertOptionToString, getMainTitle, ROUTES, TitleEntity } from '@/src/shared';
import { useIsDesktop } from '@/src/shared/hooks';
import { DashboardContentWrapper, ImageWithFallback, TranslatedContent, Typography } from '@/src/shared/ui';

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
    <NextLink href={ROUTES.WORK_PAGE(id)} className="w-full max-w-[270px] xl:max-w-[520px]">
      <DashboardContentWrapper className="shrink-0">
        <div className="flex h-full w-full">
          <div className="cover relative h-full shrink-0">
            <ImageWithFallback
              fallback="/placeholder.svg"
              src={image}
              width={isDesktop ? 85 : 75}
              height={isDesktop ? 135 : 100}
              alt="image placeholder"
              className="h-full w-full rounded object-cover object-center"
            />
          </div>

          <div className="flex max-w-[190px] grow flex-col justify-between pl-2 xl:max-w-[410px]">
            <div className="flex items-center justify-between">
              <Typography variant="h2" component="h3" className="grow truncate">
                {removeMd(getMainTitle(titles).title)}
              </Typography>
            </div>
            <div className="mt-auto flex flex-col gap-1">
              <Typography className="max-w-[240px] truncate xl:max-w-[360px]">{mainContributor}</Typography>
              <div className="flex items-center gap-4">
                <Typography className="truncate capitalize">
                  <TranslatedContent content={`workTypes.${convertOptionToString(convertedType).toLowerCase()}`} />
                </Typography>
                <WorkStatusChip status={status} />
              </div>
            </div>
          </div>
        </div>
      </DashboardContentWrapper>
    </NextLink>
  );
};

export default EditBookLink;
