'use client';

import NextLink from 'next/link';

import { type BaseEditSectionProps, getMainTitle, ROUTES, WorkStatuses } from '@/src/shared';
import {
  Breadcrumbs,
  CloseButton,
  InputLabel,
  Link,
  MarkdownRenderer,
  Modal,
  ModalWrapper,
  SubmitButton,
  Typography,
} from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import EditInternalId from '../EditInternalId/EditInternalId';
import EditPublicationDate from '../EditPublicationDate/EditPublicationDate';
import EditStatus from '../EditStatus/EditStatus';
import EditWithdrawDate from '../EditWithdrawDate/EditWithdrawDate';
import useEditWorkHeader from './useEditWorkHeader';

type EditWorkHeaderProps = BaseEditSectionProps & {
  isStatusEditable?: boolean;
  isPublicationDateEditable?: boolean;
  isWithdrawnDateEditable?: boolean;
};

const itemStyles = 'flex flex-col gap-2';

const STATUS_WARNINGS = {
  [WorkStatuses.enum.Active]: 'Changing the status to Active will update the publication date to the current date.',
  [WorkStatuses.enum.Forthcoming]:
    'Changing the status to Forthcoming will update the publication date to the current date.',
  [WorkStatuses.enum.PostponedIndefinitely]:
    'Changing the status to Postponed Indefinitely will update the publication date to the current date.',
  [WorkStatuses.enum.Cancelled]:
    'Changing the status to Cancelled will update the publication date to the current date.',
  [WorkStatuses.enum.Superseded]:
    'Changing the status to Superseded will update the publication date to the current date.',
  [WorkStatuses.enum.Withdrawn]:
    'Changing the status to Withdrawn will update the publication date to the current date.',
} as const;

const EditWorkHeader = (props: EditWorkHeaderProps) => {
  const { workId, isStatusEditable = true, isPublicationDateEditable = true, isWithdrawnDateEditable = true } = props;
  
  const {
    title,
    status,
    publicationDate,
    withdrawnDate,
    isPublicationDateDisabled,
    isWithdrawnDateRequired,
    minDate,
    latestEdition,
    previousEdition,
    translations,
    translatedWorks,
    workSet,
    showChangeStatusModal,
    pendingStatus,
    changeWorkStatus,
    applyWorkStatusChange,
    declineWorkStatusChange,
    changePublicationDate,
    changeWithdrawnDate,
  } = useEditWorkHeader({
    workId,
  });

  return (
    <ContentSection className="px-8 lg:px-11 lg:py-4">
      <div className="flex flex-col justify-between gap-3">
        <Typography variant="h1" component="h1" className="max-w-[90%]">
          <MarkdownRenderer markdown={title} />
        </Typography>

        <Breadcrumbs aria-label="breadcrumb">
          <NextLink href={ROUTES.DASHBOARD} passHref>
            <Link color="inherit" className="no-underline" component="span">
              <Typography component="span" color="inherit">
                Home
              </Typography>
            </Link>
          </NextLink>
          <NextLink href={ROUTES.WORKS} passHref>
            <Link color="inherit" className="no-underline" component="span">
              <Typography component="span" color="inherit">
                Books
              </Typography>
            </Link>
          </NextLink>
          <Typography>Edit book</Typography>
        </Breadcrumbs>

        <div className="lg:grid-col-2 grid grid-cols-2 gap-4">
          <div className={itemStyles}>
            <EditInternalId workId={workId} />
          </div>
          <div className={itemStyles}>
            <EditStatus disabled={!isStatusEditable} defaultValue={status} onUpdate={changeWorkStatus} />
          </div>
          {!isPublicationDateDisabled && (
            <div className={itemStyles}>
              <EditPublicationDate
                disabled={!isPublicationDateEditable}
                defaultValue={publicationDate ?? ''}
                onUpdate={changePublicationDate}
                minDate={minDate}
              />
            </div>
          )}
          {isWithdrawnDateRequired && (
            <div className={itemStyles}>
              <EditWithdrawDate
                disabled={!isWithdrawnDateEditable}
                defaultValue={withdrawnDate ?? ''}
                onUpdate={changeWithdrawnDate}
                minDate={minDate}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {translations.length > 0 && (
            <div className="flex gap-2">
              <InputLabel component="span" className="min-w-42 shrink-0">
                Translations
              </InputLabel>

              <ul className="w-full">
                {translations.map((work) => (
                  <li key={work.id}>
                    <NextLink href={`${ROUTES.WORK_PAGE(work.id)}`} passHref>
                      <Link className="font-normal no-underline" component="span">
                        <MarkdownRenderer markdown={getMainTitle(work.titles).title} />
                      </Link>
                    </NextLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {translatedWorks.length > 0 && (
            <div className="flex gap-2">
              <InputLabel component="span" className="min-w-42 shrink-0">
                Translation of
              </InputLabel>

              <ul className="w-full">
                {translatedWorks.map((work) => (
                  <li key={work.id}>
                    <NextLink href={`${ROUTES.WORK_PAGE(work.id)}`} passHref>
                      <Link className="font-normal no-underline" component="span">
                        <MarkdownRenderer markdown={getMainTitle(work.titles).title} />
                      </Link>
                    </NextLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {previousEdition && (
            <div className="flex gap-2">
              <InputLabel component="span" className="min-w-42 shrink-0">
                Previous Edition
              </InputLabel>

              <NextLink href={`${ROUTES.WORK_PAGE(previousEdition.id)}`} passHref>
                <Link className="font-normal no-underline" component="span">
                  <MarkdownRenderer markdown={getMainTitle(previousEdition.titles).title} />
                </Link>
              </NextLink>
            </div>
          )}

          {latestEdition && (
            <div className="flex gap-2">
              <InputLabel component="span" className="min-w-42 shrink-0">
                New Edition
              </InputLabel>

              <NextLink href={`${ROUTES.WORK_PAGE(latestEdition.id)}`} passHref>
                <Link className="font-normal no-underline" component="span">
                  <MarkdownRenderer markdown={getMainTitle(latestEdition.titles).title} />
                </Link>
              </NextLink>
            </div>
          )}

          {workSet.length > 0 && (
            <div className="flex gap-2">
              <InputLabel component="span" className="min-w-42 shrink-0">
                Volume of
              </InputLabel>

              <ul className="w-full">
                {workSet
                  .filter(({ canonical }) => canonical)
                  .map((title) => (
                    <Typography key={title.id} component="li">
                      <MarkdownRenderer markdown={title.title} />
                    </Typography>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <Modal open={showChangeStatusModal} onClose={applyWorkStatusChange}>
        <ModalWrapper>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) capitalize">
              Status Change
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={applyWorkStatusChange} />
              <CloseButton onClose={declineWorkStatusChange} />
            </div>
          </div>
          <Typography className="pl-4">{pendingStatus && STATUS_WARNINGS[pendingStatus]}</Typography>
        </ModalWrapper>
      </Modal>
    </ContentSection>
  );
};

export default EditWorkHeader;
