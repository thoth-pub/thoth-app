'use client';

import { useState } from 'react';

import { EditBookReviewForm, useBookReviewStateMachine, useCreateBookReview } from '@/src/entities/book-review';
import type { BookReviewEntity } from '@/src/entities/book-review/model/book-review.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

type AddBookReviewProps = BaseRecommendedSectionProps & {
  bookReviews?: BookReviewEntity[];
};

const emptyBookReviews: BookReviewEntity[] = [];

const AddBookReview = (props: AddBookReviewProps) => {
  const { workId, bookReviews = emptyBookReviews } = props;

  const { activeEntity: activeBookReview, finishEditing } = useBookReviewStateMachine();
  const [bookReview, setBookReview] = useState<BookReviewEntity | null>(activeBookReview);
  const { createBookReview } = useCreateBookReview({ workId });

  const create = () => {
    if (!bookReview) return;

    const lastOrderNumber = [...bookReviews].sort((a, b) => b.orderNumber - a.orderNumber)[0]?.orderNumber;

    createBookReview({
      ...bookReview,
      orderNumber: lastOrderNumber ? lastOrderNumber + 1 : 1,
    });
    finishEditing();
  };

  const updateTitle = (title: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, title });
  };

  const updateAuthorName = (authorName: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, authorName });
  };

  const updateUrl = (url: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, url });
  };

  const updateDoi = (doi: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, doi });
  };

  const updateReviewDate = (reviewDate: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, reviewDate });
  };

  const updateJournalName = (journalName: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, journalName });
  };

  const updateJournalVolume = (journalVolume: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, journalVolume });
  };

  const updateJournalNumber = (journalNumber: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, journalNumber });
  };

  const updateJournalIssn = (journalIssn: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, journalIssn });
  };

  const updateReviewerInstitution = (data: { value: string; label: string; ror: string }) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, reviewerInstitutionId: data.value, reviewerInstitutionName: data.label, reviewerInstitutionRor: data.ror });
  };

  const updateText = (text: string) => {
    if (!bookReview) return;
    setBookReview({ ...bookReview, text });
  };

  if (!bookReview) return null;

  const { title, authorName, reviewerInstitutionId, reviewerInstitutionName, url, doi, reviewDate, journalName, journalVolume, journalNumber, journalIssn, text } =
    bookReview;

  return (
    <TableNewEntityFormWrapper>
      <EditBookReviewForm
        title={title}
        authorName={authorName}
        reviewerInstitutionId={reviewerInstitutionId}
        reviewerInstitutionName={reviewerInstitutionName}
        url={url}
        doi={doi}
        reviewDate={reviewDate}
        journalName={journalName}
        journalVolume={journalVolume}
        journalNumber={journalNumber}
        journalIssn={journalIssn}
        text={text}
        onTitleUpdate={updateTitle}
        onAuthorNameUpdate={updateAuthorName}
        onReviewerInstitutionUpdate={updateReviewerInstitution}
        onUrlUpdate={updateUrl}
        onDoiUpdate={updateDoi}
        onReviewDateUpdate={updateReviewDate}
        onJournalNameUpdate={updateJournalName}
        onJournalVolumeUpdate={updateJournalVolume}
        onJournalNumberUpdate={updateJournalNumber}
        onJournalIssnUpdate={updateJournalIssn}
        onTextUpdate={updateText}
        onDone={create}
        onClose={finishEditing}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddBookReview;
