'use client';

import NextLink from 'next/link';

import { type BaseEditSectionProps, ROUTES } from '@/src/shared';
import { Breadcrumbs, InputLabel, Link, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import EditStatus from '../EditStatus/EditStatus';
import { type EditWorkHeaderFormProps } from './components/EditWorkHeaderForm';
import useEditWorkHeader from './useEditWorkHeader';

type EditWorkHeaderProps = BaseEditSectionProps & Omit<EditWorkHeaderFormProps, 'status'>;

const itemStyles = 'flex flex-col gap-2';

const EditWorkHeader = ({ workId, queryToken }: EditWorkHeaderProps) => {
  const { title, id, status, publicationDate, isPublicationDateDisabled, minDate, changeWorkStatus } =
    useEditWorkHeader({
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

        <div className="grid grid-cols-[repeat(3,1fr)] gap-2">
          <div className={itemStyles}>
            <InputLabel component="span">Internal ID</InputLabel>
            <Typography>{id}</Typography>
          </div>
          <div className={itemStyles}>
            <EditStatus defaultValue={status} onUpdate={changeWorkStatus} />
          </div>
          <div className={itemStyles}>
            <InputLabel component="span">Publication Date</InputLabel>
            <Typography component="span" color="inherit">
              {publicationDate}
            </Typography>
          </div>
        </div>
      </div>
    </ContentSection>
  );
};

export default EditWorkHeader;
