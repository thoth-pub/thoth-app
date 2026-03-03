import DownloadIcon from '@mui/icons-material/Download';
import WarningIcon from '@mui/icons-material/Warning';
import { Activity } from 'react';

import { Button, Tooltip, TranslatedContent, Typography } from '@/src/shared/ui';
import { getSpecificationPlaceholder } from '@/src/shared/utils';

import { SpecificationResult } from '../../../model/metadata.types';

type LinksListProps = {
  links: Record<string, SpecificationResult>;
};

const itemStyles = 'shrink-0 text-nowrap';

export const LinksList = (props: LinksListProps) => {
  const { links } = props;

  const isEmpty = Object.keys(links).length === 0;

  if (isEmpty) {
    return (
      <Typography className="text-center text-(--color-typography)">
        <TranslatedContent content="metadata not available" />
      </Typography>
    );
  }

  return (
    <ul className="flex w-full flex-wrap gap-x-2 gap-y-4">
      {Object.entries(links).map(([key, { status, data }], index) => (
        <li key={index}>
          <Activity mode={status === 'success' ? 'visible' : 'hidden'}>
            <Button
              className={itemStyles}
              variant="outlined"
              component="a"
              color="primary"
              href={data}
              rel="noopener noreferrer"
              endIcon={<DownloadIcon />}
            >
              {getSpecificationPlaceholder(key)}
            </Button>
          </Activity>
          <Activity mode={status === 'error' ? 'visible' : 'hidden'}>
            <Tooltip
              title={
                <Typography component="span" color="error" className="text-sm">
                  {data.replaceAll('"', '')}
                </Typography>
              }
            >
              <span>
                <Button className={itemStyles} color="error" variant="outlined" disabled endIcon={<WarningIcon />}>
                  {getSpecificationPlaceholder(key)}
                </Button>
              </span>
            </Tooltip>
          </Activity>
        </li>
      ))}
    </ul>
  );
};
