'use client';

import NextLink from 'next/link';
import removeMd from 'remove-markdown';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { useWorkRecommendations } from '@/src/entities/work';
import type { WorkStatus } from '@/src/entities/work/model/work.types';
import { convertOptionToString, getMainTitle, ROUTES, TitleEntity } from '@/src/shared';
import { useIsDesktop } from '@/src/shared/hooks';
import { Chip, DashboardContentWrapper, Typography } from '@/src/shared/ui';
import DataIndicator from '@/src/shared/ui/core/DataIndicator/DataIndicator';

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

  const { isAllInformationFilled, isEmpty } = useWorkRecommendations({ workId: id });
  const isDesktop = useIsDesktop();

  const mainContributor = contributions.find(({ isMain }) => isMain)?.fullName ?? '';

  return (
    <NextLink href={ROUTES.WORK_PAGE(id)} className="w-full max-w-[270px] xl:max-w-[520px]">
      <DashboardContentWrapper className="shrink-0">
        <div className="flex h-full w-full">
          <div className="cover relative h-full shrink-0">
            <img
              src="/placeholder.svg"
              width={isDesktop ? 85 : 75}
              height={isDesktop ? 135 : 100}
              alt="image placeholder"
              className="h-full w-full rounded object-cover object-center"
            />
            {image && image.length > 0 && (
              <img
                alt="book cover"
                src={image}
                width={isDesktop ? 85 : 75}
                height={isDesktop ? 135 : 100}
                className="absolute top-0 left-0 z-10 h-full w-full object-contain object-center"
              />
            )}
          </div>

          <div className="flex max-w-[190px] grow flex-col justify-between pl-2 xl:max-w-[410px]">
            <div className="flex items-center justify-between">
              <Typography variant="h2" component="h3" className="grow truncate">
                {removeMd(getMainTitle(titles).title)}
              </Typography>
              <DataIndicator
                isEmpty={isEmpty}
                isValid={isAllInformationFilled}
                component="div"
                indicatorClassName="h-[10px] w-[10px] xl:h-5 xl:w-5"
                className="shrink-0 p-0"
                sx={{
                  minWidth: '20px',
                  minHeight: '20px',
                  marginBottom: 'auto',
                  '&.MuiButtonBase-root.MuiButton-root:hover': {
                    boxShadow: 'none',
                  },
                }}
              />
            </div>
            <div className="mt-auto flex flex-col gap-1">
              <Typography className="max-w-[240px] truncate xl:max-w-[360px]">{mainContributor}</Typography>
              <div className="flex items-center gap-4">
                <Typography className="truncate">{convertOptionToString(convertedType)}</Typography>
                <Chip label={convertOptionToString(status)} size="small" component="span" />
              </div>
            </div>
          </div>
        </div>
      </DashboardContentWrapper>
    </NextLink>
  );
};

export default EditBookLink;
