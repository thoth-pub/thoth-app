import { Button, ButtonGroup, OrchidLogo, Typography } from '@/src/shared/ui';

type HeaderProps = {
  title: string;
  orchidId?: string;
  onDone?: () => void;
};

export const Header = ({ title, orchidId, onDone }: HeaderProps) => {
  return (
    <div className="flex justify-between">
      <Typography variant="h2" component="h3" className="text-[var(--color-typography)]">
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
