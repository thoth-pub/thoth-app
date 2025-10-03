'use client';

import { LinkTooltip, OrchidLogo, TableFormsHeader } from '@/src/shared/ui';
import { convertOrchidIdToText } from '@/src/shared/utils';

type FormHeaderProps = {
  title: string;
  orcidId?: string;
  onDone?: () => void;
  onClose?: () => void;
};

export const FormHeader = ({ title, orcidId, onDone, onClose }: FormHeaderProps) => {
  return (
    <TableFormsHeader title={title} onDone={onDone} onClose={onClose}>
      {orcidId && (
        <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
          <OrchidLogo />
        </LinkTooltip>
      )}
    </TableFormsHeader>
  );
};
