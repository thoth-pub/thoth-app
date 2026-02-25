import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { Typography } from '@mui/material';

import { Chip } from '@/src/shared/ui';

type ContributorsChipProps = {
  contributors: string[];
  limit?: number;
};

const ContributorsChip = (props: ContributorsChipProps) => {
  const { contributors, limit = 3 } = props;

  if (contributors.length === 0) return null;

  const isMultiple = contributors.length > 1;
  const isMoreThanLimit = contributors.length > limit;

  return (
    <div className="flex items-center gap-1">
      {isMultiple ? <GroupIcon fontSize="small" color="primary" /> : <PersonIcon fontSize="small" color="primary" />}
      <Typography component="li">{contributors.slice(0, limit).join(', ')}</Typography>
      {isMoreThanLimit && <Chip label={`+${contributors.length - limit}`} />}
    </div>
  );
};

export default ContributorsChip;
