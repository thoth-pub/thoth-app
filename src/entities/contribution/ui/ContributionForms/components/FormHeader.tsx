'use client';

import { CloseButton, LinkTooltip, OrchidLogo, SubmitButton, Typography } from '@/src/shared/ui';
import { convertOrchidIdToText } from '@/src/shared/utils';

type FormHeaderProps = {
  title: string;
  orcidId?: string;
  onDone?: () => void;
  onClose?: () => void;
};

export const FormHeader = ({ title, orcidId, onDone, onClose }: FormHeaderProps) => {
  return (
    <div className="flex justify-between">
      <Typography variant="h2" component="h3" className="flex items-center gap-1 text-[var(--color-typography)]">
        {title}
        {orcidId && (
          <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
            <OrchidLogo />
          </LinkTooltip>
        )}
      </Typography>
      <div className="flex gap-1">
        <SubmitButton type="button" onClick={onDone} />
        <CloseButton onClose={onClose} />
      </div>
    </div>
  );
};
