'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import { EditBookReviewAuthorName } from '../EditBookReviewAuthorName/EditBookReviewAuthorName';
import { EditBookReviewDoi } from '../EditBookReviewDoi/EditBookReviewDoi';
import { EditBookReviewJournalIssn } from '../EditBookReviewJournalIssn/EditBookReviewJournalIssn';
import { EditBookReviewJournalName } from '../EditBookReviewJournalName/EditBookReviewJournalName';
import { EditBookReviewJournalNumber } from '../EditBookReviewJournalNumber/EditBookReviewJournalNumber';
import { EditBookReviewJournalVolume } from '../EditBookReviewJournalVolume/EditBookReviewJournalVolume';
import { EditBookReviewPageRange } from '../EditBookReviewPageRange/EditBookReviewPageRange';
import { EditBookReviewReviewDate } from '../EditBookReviewReviewDate/EditBookReviewReviewDate';
import { EditBookReviewReviewerInstitution } from '../EditBookReviewReviewerInstitution/EditBookReviewReviewerInstitution';
import { EditBookReviewReviewerOrcid } from '../EditBookReviewReviewerOrcid/EditBookReviewReviewerOrcid';
import { EditBookReviewText } from '../EditBookReviewText/EditBookReviewText';
import { EditBookReviewTitle } from '../EditBookReviewTitle/EditBookReviewTitle';
import { EditBookReviewUrl } from '../EditBookReviewUrl/EditBookReviewUrl';

type EditBookReviewFormProps = {
  title?: string;
  authorName?: string;
  reviewerOrcid?: string;
  reviewerInstitutionId?: string;
  reviewerInstitutionName?: string;
  url?: string;
  doi?: string;
  reviewDate?: string;
  journalName?: string;
  journalVolume?: string;
  journalNumber?: string;
  journalIssn?: string;
  pageRange?: string;
  text?: string;
  isDoneDisabled?: boolean;
  onTitleUpdate?: (data: string) => void;
  onAuthorNameUpdate?: (data: string) => void;
  onReviewerOrcidUpdate?: (data: string) => void;
  onReviewerInstitutionUpdate?: (data: { value: string; label: string; ror: string }) => void;
  onUrlUpdate?: (data: string) => void;
  onDoiUpdate?: (data: string) => void;
  onReviewDateUpdate?: (data: string) => void;
  onJournalNameUpdate?: (data: string) => void;
  onJournalVolumeUpdate?: (data: string) => void;
  onJournalNumberUpdate?: (data: string) => void;
  onJournalIssnUpdate?: (data: string) => void;
  onPageRangeUpdate?: (data: string) => void;
  onTextUpdate?: (data: string) => void;
  onDone?: () => void;
  onClose?: () => void;
};

const EditBookReviewForm = (props: EditBookReviewFormProps) => {
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
    isDoneDisabled,
    onTitleUpdate,
    onAuthorNameUpdate,
    onReviewerOrcidUpdate,
    onReviewerInstitutionUpdate,
    onUrlUpdate,
    onDoiUpdate,
    onReviewDateUpdate,
    onJournalNameUpdate,
    onJournalVolumeUpdate,
    onJournalNumberUpdate,
    onJournalIssnUpdate,
    onPageRangeUpdate,
    onTextUpdate,
    onDone,
    onClose,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader title="book review" onDone={onDone} onClose={onClose} isDoneDisabled={isDoneDisabled} />
      <EditBookReviewTitle defaultValue={title} onUpdate={onTitleUpdate} />
      <EditBookReviewAuthorName defaultValue={authorName} onUpdate={onAuthorNameUpdate} />
      <EditBookReviewReviewerOrcid defaultValue={reviewerOrcid} onUpdate={onReviewerOrcidUpdate} />
      <EditBookReviewReviewerInstitution
        defaultValue={{ value: reviewerInstitutionId ?? '', label: reviewerInstitutionName ?? '' }}
        onUpdate={onReviewerInstitutionUpdate}
      />
      <EditBookReviewUrl defaultValue={url} onUpdate={onUrlUpdate} />
      <EditBookReviewDoi defaultValue={doi} onUpdate={onDoiUpdate} />
      <EditBookReviewReviewDate defaultValue={reviewDate} onUpdate={onReviewDateUpdate} />
      <EditBookReviewJournalName defaultValue={journalName} onUpdate={onJournalNameUpdate} />
      <EditBookReviewJournalIssn defaultValue={journalIssn} onUpdate={onJournalIssnUpdate} />
      <EditBookReviewJournalVolume defaultValue={journalVolume} onUpdate={onJournalVolumeUpdate} />
      <EditBookReviewJournalNumber defaultValue={journalNumber} onUpdate={onJournalNumberUpdate} />
      <EditBookReviewPageRange defaultValue={pageRange} onUpdate={onPageRangeUpdate} />
      <EditBookReviewText defaultValue={text} onUpdate={onTextUpdate} />
    </TableFormsWrapper>
  );
};

export default EditBookReviewForm;
