'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  CardsList,
  CloseButton,
  Modal,
  ModalWrapper,
  Pagination,
  SubmitButton,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

import { WorkCardListItem } from './WorkCardListItem';

type PendingAction = 'reissue' | 'translation';

const WORK_CARD_WARNINGS: Record<PendingAction, ReactNode> = {
  reissue: <TranslatedContent content="reissueWorkWarning" namespace={NAMESPACES.enum.warnings} />,
  translation: <TranslatedContent content="translateWorkWarning" namespace={NAMESPACES.enum.warnings} />,
};

type WorksCardListProps = {
  loading: boolean;
  works: WorkEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
  navigateToWork: (id: string) => void;
  onCreateNewEdition: (work: WorkEntity) => void;
  onCreateTranslation: (work: WorkEntity) => void;
};

export const WorksCardList = (props: WorksCardListProps) => {
  const { loading, works, page, pagesCount, onPageChange, navigateToWork, onCreateNewEdition, onCreateTranslation } =
    props;

  const [pending, setPending] = useState<{ type: PendingAction; work: WorkEntity } | null>(null);

  const requestEdition = (work: WorkEntity) => setPending({ type: 'reissue', work });
  const requestTranslation = (work: WorkEntity) => setPending({ type: 'translation', work });
  const cancelPending = () => setPending(null);

  const confirmPending = () => {
    if (!pending) return;

    if (pending.type === 'reissue') {
      onCreateNewEdition(pending.work);
    } else {
      onCreateTranslation(pending.work);
    }

    setPending(null);
  };

  return (
    <>
      {works.length === 0 && !loading && (
        <Typography component="span" className="flex h-full min-h-100 items-center justify-center">
          <TranslatedContent content="emptyTable" namespace={NAMESPACES.enum.works} />
        </Typography>
      )}
      <CardsList items={works} loading={loading} backdropClassName="min-h-100" listClassName="min-h-100">
        {() => (
          <>
            {works.map((work) => (
              <WorkCardListItem
                key={work.id}
                work={work}
                createNewEdition={requestEdition}
                createTranslation={requestTranslation}
                navigateToWork={navigateToWork}
              />
            ))}
          </>
        )}
      </CardsList>
      <Pagination
        page={page}
        count={pagesCount}
        color="primary"
        className="ml-auto"
        showFirstButton
        showLastButton
        onChange={(_, value) => onPageChange(value)}
        disabled={loading}
      />

      <Modal open={pending !== null} onClose={confirmPending}>
        <ModalWrapper onClickAway={cancelPending}>
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="pl-4 text-(--color-typography) capitalize">
              <TranslatedContent content={pending?.type ?? ''} />
            </Typography>
            <div className="flex gap-2">
              <SubmitButton onClick={confirmPending} />
              <CloseButton onClose={cancelPending} />
            </div>
          </div>
          <Typography className="pl-4">{pending && WORK_CARD_WARNINGS[pending.type]}</Typography>
        </ModalWrapper>
      </Modal>
    </>
  );
};
