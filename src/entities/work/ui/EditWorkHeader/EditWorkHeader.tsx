'use client';

import NextLink from 'next/link';

import { type BaseEditSectionProps, ROUTES } from '@/src/shared';
import { Breadcrumbs, InputLabel, Link, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import EditPublicationDate from '../EditPublicationDate/EditPublicationDate';
import EditStatus from '../EditStatus/EditStatus';
import EditWithdrawDate from '../EditWithdrawDate/EditWithdrawDate';
import useEditWorkHeader from './useEditWorkHeader';

type EditWorkHeaderProps = BaseEditSectionProps;

const itemStyles = 'flex flex-col gap-2';

const EditWorkHeader = ({ workId, queryToken }: EditWorkHeaderProps) => {
  const {
    title,
    id,
    status,
    publicationDate,
    withdrawnDate,
    isPublicationDateDisabled,
    isWithdrawnDateRequired,
    minDate,
    changeWorkStatus,
    changePublicationDate,
    changeWithdrawnDate,
  } = useEditWorkHeader({
    workId,
    queryToken,
  });

  return (
    <ContentSection className="px-8 py-4">
      <div className="flex flex-col justify-between gap-3">
        <Typography variant="h1" component="h1" className="max-w-[90%]">
          {title}
        </Typography>

        <Breadcrumbs aria-label="breadcrumb">
          <NextLink href={ROUTES.DASHBOARD} passHref>
            <Link color="inherit" className="no-underline">
              <Typography component="span" color="inherit">
                Home
              </Typography>
            </Link>
          </NextLink>
          <NextLink href={ROUTES.WORKS} passHref>
            <Link color="inherit" className="no-underline">
              <Typography component="span" color="inherit">
                Books
              </Typography>
            </Link>
          </NextLink>
          <Typography>Edit book</Typography>
        </Breadcrumbs>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.5fr_repeat(3,1fr)]">
          <div className={itemStyles}>
            <InputLabel component="span">Internal ID</InputLabel>
            <Typography>{id}</Typography>
          </div>
          <div className={itemStyles}>
            <EditStatus defaultValue={status} onUpdate={changeWorkStatus} />
          </div>
          {!isPublicationDateDisabled && (
            <div className={itemStyles}>
              <EditPublicationDate
                defaultValue={publicationDate ?? ''}
                onUpdate={changePublicationDate}
                minDate={minDate}
              />
            </div>
          )}
          {isWithdrawnDateRequired && (
            <div className={itemStyles}>
              <EditWithdrawDate defaultValue={withdrawnDate ?? ''} onUpdate={changeWithdrawnDate} minDate={minDate} />
            </div>
          )}
        </div>
      </div>
    </ContentSection>
  );
};

export default EditWorkHeader;
