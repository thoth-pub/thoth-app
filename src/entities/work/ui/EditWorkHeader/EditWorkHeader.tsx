'use client';

import NextLink from 'next/link';

import { ROUTES, WorkStatuses } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { BaseEditSectionProps } from '@/src/shared/types';
import {
  Breadcrumbs,
  CloseButton,
  ContentSection,
  InputLabel,
  Link,
  MarkdownRenderer,
  Modal,
  ModalWrapper,
  SubmitButton,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { getMainTitle } from '@/src/shared/utils';

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
  [WorkStatuses.enum.Active]: <TranslatedContent content="active" namespace={NAMESPACES.enum.warnings} />,
  [WorkStatuses.enum.Forthcoming]: <TranslatedContent content="forthcoming" namespace={NAMESPACES.enum.warnings} />,
  [WorkStatuses.enum.PostponedIndefinitely]: (
    <TranslatedContent content="postponed indefinitely" namespace={NAMESPACES.enum.warnings} />
  ),
  [WorkStatuses.enum.Cancelled]: <TranslatedContent content="cancelled" namespace={NAMESPACES.enum.warnings} />,
  [WorkStatuses.enum.Superseded]: <TranslatedContent content="superseded" namespace={NAMESPACES.enum.warnings} />,
  [WorkStatuses.enum.Withdrawn]: <TranslatedContent content="withdrawn" namespace={NAMESPACES.enum.warnings} />,
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
              <Typography component="span" color="inherit" className="capitalize">
                <TranslatedContent content="home" namespace={NAMESPACES.enum.navigation} />
              </Typography>
            </Link>
          </NextLink>
          <NextLink href={ROUTES.WORKS} passHref>
            <Link color="inherit" className="no-underline" component="span">
              <Typography component="span" color="inherit" className="capitalize">
                <TranslatedContent content="books" namespace={NAMESPACES.enum.navigation} />
              </Typography>
            </Link>
          </NextLink>
          <Typography>
            <TranslatedContent content="edit book" namespace={NAMESPACES.enum.navigation} />
          </Typography>
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
              <InputLabel component="span" className="min-w-42 shrink-0 capitalize">
                <TranslatedContent content="translated to" />
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
              <InputLabel component="span" className="min-w-42 shrink-0 capitalize">
                <TranslatedContent content="translation of" />
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
              <InputLabel component="span" className="min-w-42 shrink-0 capitalize">
                <TranslatedContent content="previous edition" />
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
              <InputLabel component="span" className="min-w-42 shrink-0 capitalize">
                <TranslatedContent content="new edition" />
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
                <TranslatedContent content="volume of" />
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
              <TranslatedContent content="status change" />
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
