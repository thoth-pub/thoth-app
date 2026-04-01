import LaunchIcon from '@mui/icons-material/Launch';
import type { ReactNode } from 'react';

import { Link, Tooltip } from '@/src/shared/ui';

type LinkTooltipProps = {
  link: string;
  linkText: string;
  children: Readonly<ReactNode>;
};

const LinkTooltip = ({ link, linkText, children }: LinkTooltipProps) => {
  return (
    <Tooltip
      arrow
      className="shrink-0 shadow-2xl"
      slotProps={{
        popper: {
          onClick(e) {
            e.stopPropagation();
          },
        },
      }}
      title={
        <div className="flex items-center gap-1">
          <Link href={link} target="_blank" rel="noopener noreferrer" className="max-w-[100px] truncate">
            {linkText}
          </Link>
          <LaunchIcon color="primary" className="h-4 w-4" />
        </div>
      }
      placement="right"
    >
      <span>{children}</span>
    </Tooltip>
  );
};

export default LinkTooltip;
