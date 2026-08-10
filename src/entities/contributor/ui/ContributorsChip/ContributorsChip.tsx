import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { Typography } from '@mui/material';
import { Fragment } from 'react';

import { Chip, OrcidLink } from '@/src/shared/ui';

type ContributorDetails = {
  id: string;
  fullName: string;
  orcidId?: string;
};

type ContributorsChipProps = {
  contributors: string[] | ContributorDetails[];
  limit?: number;
};

const hasContributorDetails = (
  contributors: ContributorsChipProps['contributors'],
): contributors is ContributorDetails[] => typeof contributors[0] !== 'string';

const ContributorsChip = (props: ContributorsChipProps) => {
  const { contributors, limit = 3 } = props;

  if (contributors.length === 0) return null;

  const isMultiple = contributors.length > 1;
  const isMoreThanLimit = contributors.length > limit;
  const visibleContributors = hasContributorDetails(contributors)
    ? contributors.slice(0, limit).map((contributor, index) => (
        <Fragment key={contributor.id}>
          {index > 0 ? ', ' : null}
          {contributor.orcidId ? (
            <span className="inline-flex items-center gap-1">
              {contributor.fullName}
              <OrcidLink orcidId={contributor.orcidId} />
            </span>
          ) : (
            contributor.fullName
          )}
        </Fragment>
      ))
    : contributors.slice(0, limit).join(', ');

  return (
    <div className="flex items-center gap-1">
      {isMultiple ? <GroupIcon fontSize="small" color="primary" /> : <PersonIcon fontSize="small" color="primary" />}
      <Typography component="li">{visibleContributors}</Typography>
      {isMoreThanLimit && <Chip label={`+${contributors.length - limit}`} />}
    </div>
  );
};

export default ContributorsChip;
