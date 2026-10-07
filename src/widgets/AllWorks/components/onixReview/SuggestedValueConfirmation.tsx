'use client';

import { type ReactNode, useState } from 'react';

import { Button, Typography } from '@/src/shared/ui';

type SuggestedValueConfirmationProps = {
  /** The id of the question's heading, which the controls are described by. */
  readonly describedBy: string;
  /** The one-sentence basis of the proposal, e.g. "Based on the contributor roles, this looks like an Edited book." */
  readonly basis: string;
  readonly confirmLabel: string;
  readonly chooseAnotherLabel: string;
  /** Writes the proposed value to its canonical input. */
  readonly onConfirm: () => void;
  /** The control that takes any other valid value, shown once the publisher asks for it. */
  readonly children: ReactNode;
  /** Whether the alternative control starts open: an answer being changed, or a proposal already declined. */
  readonly open?: boolean;
};

/**
 * One strong inferred value the publisher still has authority over (#179 6036599101, interaction rule 2): the basis
 * stated once, then Confirm or Choose another. The proposal decides nothing until Confirm writes it; choosing another
 * opens the control that takes any other valid value, and the proposal can still be confirmed beside it.
 */
export const SuggestedValueConfirmation = ({
  describedBy,
  basis,
  confirmLabel,
  chooseAnotherLabel,
  onConfirm,
  children,
  open = false,
}: SuggestedValueConfirmationProps) => {
  const [choosing, setChoosing] = useState(open);

  return (
    <div className="flex flex-col gap-2" data-testid="onix-review-suggestion">
      <Typography component="p" variant="body2">
        {basis}
      </Typography>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="contained" size="small" aria-describedby={describedBy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        {!choosing && (
          <Button variant="text" size="small" aria-describedby={describedBy} onClick={() => setChoosing(true)}>
            {chooseAnotherLabel}
          </Button>
        )}
      </div>
      {choosing && children}
    </div>
  );
};
