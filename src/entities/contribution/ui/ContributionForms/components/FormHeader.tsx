'use client';

import { OrcidLink, TableFormsHeader } from '@/src/shared/ui';

type FormHeaderProps = {
  title: string;
  orcidId?: string;
  onDone?: () => void;
  onClose?: () => void;
};

export const FormHeader = ({ title, orcidId, onDone, onClose }: FormHeaderProps) => {
  return (
    <TableFormsHeader title={title} onDone={onDone} onClose={onClose}>
      {orcidId && <OrcidLink orcidId={orcidId} />}
    </TableFormsHeader>
  );
};
