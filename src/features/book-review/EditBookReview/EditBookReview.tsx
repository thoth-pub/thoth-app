'use client';

import { EditBookReviewForm, useBookReviewStateMachine, useUpdateBookReview } from '@/src/entities/book-review';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

const EditBookReview = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeBookReview, update, finishEditing } = useBookReviewStateMachine();
  const { updateBookReview } = useUpdateBookReview({ workId });

  const updateTitle = (title: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, title });
    updateBookReview({ ...activeBookReview, title });
  };

  const updateAuthorName = (authorName: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, authorName });
    updateBookReview({ ...activeBookReview, authorName });
  };

  const updateReviewerOrcid = (reviewerOrcid: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, reviewerOrcid });
    updateBookReview({ ...activeBookReview, reviewerOrcid });
  };

  const updateUrl = (url: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, url });
    updateBookReview({ ...activeBookReview, url });
  };

  const updateDoi = (doi: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, doi });
    updateBookReview({ ...activeBookReview, doi });
  };

  const updateReviewDate = (reviewDate: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, reviewDate });
    updateBookReview({ ...activeBookReview, reviewDate });
  };

  const updateJournalName = (journalName: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, journalName });
    updateBookReview({ ...activeBookReview, journalName });
  };

  const updateJournalVolume = (journalVolume: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, journalVolume });
    updateBookReview({ ...activeBookReview, journalVolume });
  };

  const updateJournalNumber = (journalNumber: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, journalNumber });
    updateBookReview({ ...activeBookReview, journalNumber });
  };

  const updateJournalIssn = (journalIssn: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, journalIssn });
    updateBookReview({ ...activeBookReview, journalIssn });
  };

  const updateReviewerInstitution = (data: { value: string; label: string; ror: string }) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, reviewerInstitutionId: data.value, reviewerInstitutionName: data.label, reviewerInstitutionRor: data.ror });
    updateBookReview({ ...activeBookReview, reviewerInstitutionId: data.value, reviewerInstitutionName: data.label, reviewerInstitutionRor: data.ror });
  };

  const updatePageRange = (pageRange: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, pageRange });
    updateBookReview({ ...activeBookReview, pageRange });
  };

  const updateText = (text: string) => {
    if (!activeBookReview) return;

    update({ ...activeBookReview, text });
    updateBookReview({ ...activeBookReview, text });
  };

  if (!activeBookReview) return null;

  const {
    title,
    authorName,
    reviewerOrcid,
    reviewerInstitutionId,
    reviewerInstitutionName,
    url,
    doi,
    reviewDate,
    journalName,
    journalVolume,
    journalNumber,
    journalIssn,
    pageRange,
    text,
  } = activeBookReview;

  return (
    <EditBookReviewForm
      title={title}
      authorName={authorName}
      reviewerOrcid={reviewerOrcid}
      reviewerInstitutionId={reviewerInstitutionId}
      reviewerInstitutionName={reviewerInstitutionName}
      url={url}
      doi={doi}
      reviewDate={reviewDate}
      journalName={journalName}
      journalVolume={journalVolume}
      journalNumber={journalNumber}
      journalIssn={journalIssn}
      pageRange={pageRange}
      text={text}
      isDoneDisabled={!title?.trim()}
      onTitleUpdate={updateTitle}
      onAuthorNameUpdate={updateAuthorName}
      onReviewerOrcidUpdate={updateReviewerOrcid}
      onReviewerInstitutionUpdate={updateReviewerInstitution}
      onUrlUpdate={updateUrl}
      onDoiUpdate={updateDoi}
      onReviewDateUpdate={updateReviewDate}
      onJournalNameUpdate={updateJournalName}
      onJournalVolumeUpdate={updateJournalVolume}
      onJournalNumberUpdate={updateJournalNumber}
      onJournalIssnUpdate={updateJournalIssn}
      onPageRangeUpdate={updatePageRange}
      onTextUpdate={updateText}
      onDone={finishEditing}
      onClose={finishEditing}
    />
  );
};

export default EditBookReview;
