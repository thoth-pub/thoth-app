'use client';

import { TranslatedContent, Typography } from '@/src/shared/ui';

type BulkMismatchNoticeProps = {
  // Key in the `warnings` namespace, e.g. `chaptersLicenseMismatch`.
  content: string;
};

/**
 * Notice shown when the selected chapters disagree on a bulk-editable field, so it cannot
 * be edited in bulk. Mirrors the contributors/fundings mismatch notices for consistency.
 */
const BulkMismatchNotice = ({ content }: BulkMismatchNoticeProps) => (
  <Typography className="pl-4">
    <TranslatedContent content={content} namespace="warnings" />
  </Typography>
);

export default BulkMismatchNotice;
