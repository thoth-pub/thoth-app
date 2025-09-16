import LaunchIcon from '@mui/icons-material/Launch';
import type { ReactNode } from 'react';

import { Link, Tooltip } from '@/src/shared/ui';

type LinkTooltipProps = {
  link: string;
  linkText: string;
  children: Readonly<ReactNode>;
};

export const LinkTooltip = ({ link, linkText, children }: LinkTooltipProps) => {
  return (
    <Tooltip
      arrow
      className="shadow-2xl"
      title={
        <div className="flex items-center gap-1">
          <LaunchIcon fontSize="small" color="primary" className="h-3 w-3" />
          <Link href={link} target="_blank" rel="noopener noreferrer">
            {linkText}
          </Link>
        </div>
      }
      placement="right"
    >
      <div>{children}</div>
    </Tooltip>
  );
};
