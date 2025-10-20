'use client';

import NextLink from 'next/link';

import { useWorkRecommendations } from '@/src/entities/work';
import type { WorkContribution, WorkStatus } from '@/src/entities/work/model/work.types';
import { convertOptionToString, ROUTES } from '@/src/shared';
import { workStatusOptions } from '@/src/shared/constants/formFields';
import { Chip, DashboardContentWrapper, Typography } from '@/src/shared/ui';
import DataIndicator from '@/src/shared/ui/core/DataIndicator/DataIndicator';

type EditBookLinkProps = {
  title: string;
  id: string;
  type: string;
  status: WorkStatus;
  contributions: WorkContribution[];
  image?: string;
};

const EditBookLink = ({
  title,
  id,
  status,
  type,
  image = '/book-placeholder.jpg',
  contributions,
}: EditBookLinkProps) => {
  const convertedType = convertOptionToString(type);

  const workStatusOption = workStatusOptions.find(({ value }) => value === status) ?? workStatusOptions[0];
  const { isAllInformationFilled, isEmpty } = useWorkRecommendations({ workId: id });

  const uniqueContributions = Array.from(new Set(contributions.map(({ fullName }) => fullName))).join(', ');

  return (
    <NextLink href={ROUTES.WORK_PAGE(id)} className="w-full max-w-[520px] shrink-0">
      <DashboardContentWrapper className="shrink-0">
        <div className="flex h-full w-full overflow-hidden">
          <img alt="book cover" src={image} width={85} height={135} className="cover h-full" />
          <div className="ml-2 flex w-full grow flex-col justify-between">
            <Typography
              variant="h2"
              component="h3"
              color="primary"
              className="max-h-[50px] max-w-[240px] truncate text-wrap lg:max-w-[390px]"
            >
              {title}
            </Typography>
            <div className="mt-auto flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <Typography>{convertedType}</Typography>
                <Chip label={workStatusOption.label} size="small" component="span" />
              </div>
              <div className="flex items-center justify-between">
                <Typography className="max-w-[240px] truncate lg:max-w-[360px]">
                  {uniqueContributions}
                  {uniqueContributions}
                </Typography>
                <DataIndicator
                  isEmpty={isEmpty}
                  isValid={isAllInformationFilled}
                  component="div"
                  sx={{
                    padding: 0,
                    minWidth: '20px',
                    maxHeight: '20px',
                    '&.MuiButtonBase-root.MuiButton-root:hover': {
                      boxShadow: 'none',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DashboardContentWrapper>
    </NextLink>
  );
};

export default EditBookLink;
