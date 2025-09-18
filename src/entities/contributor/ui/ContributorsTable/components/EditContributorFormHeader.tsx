'use client';

import { Button, ButtonGroup, OrchidLogo, Typography } from '@/src/shared/ui';

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
        {orchidId && <OrchidLogo />}
      </Typography>
      <ButtonGroup>
        <Button variant="contained" onClick={onDone}>
          Done
        </Button>
      </ButtonGroup>
    </div>
  );
};
