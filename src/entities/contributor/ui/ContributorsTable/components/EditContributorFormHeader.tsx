'use client';

import { OrchidLogo, SubmitButton, Typography } from '@/src/shared/ui';
import { convertOrchidIdToText } from '@/src/shared/utils';

import { LinkTooltip } from './LinkTooltip';

type EditContributorFormHeaderProps = {
  title: string;
  orchidId?: string;
  onDone?: () => void;
};

export const EditContributorFormHeader = ({ title, orchidId, onDone }: EditContributorFormHeaderProps) => {
  return (
    <div className="flex justify-between">
      <Typography variant="h2" component="h3" className="flex items-center gap-1 text-[var(--color-typography)]">
        {title}
        {orchidId && (
          <LinkTooltip link={orchidId} linkText={convertOrchidIdToText(orchidId)}>
            <OrchidLogo />
          </LinkTooltip>
        )}
      </Typography>
      <SubmitButton type="button" onClick={onDone} />
    </div>
  );
};
