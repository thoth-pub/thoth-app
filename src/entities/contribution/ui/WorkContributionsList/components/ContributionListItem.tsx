import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BadgeIcon from '@mui/icons-material/Badge';
import StarIcon from '@mui/icons-material/Star';

import {
  CardListItem,
  DeleteButton,
  Indicator,
  MarkdownPreview,
  OrcidLink,
  RorLink,
  Typography,
} from '@/src/shared/ui';
import { convertOptionToString } from '@/src/shared/utils';

import type { WorkContribution } from '../../../model/contribution.types';

type ContributionListItemProps = {
  contribution: WorkContribution;
  draggable?: boolean;
  showRecommendations?: boolean;
  editing?: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export const ContributionListItem = (props: ContributionListItemProps) => {
  const {
    contribution,
    showRecommendations = false,
    draggable = false,
    editing = false,
    form,
    editDisabled = false,
    onEdit,
    onDelete,
    deleteLoading = false,
  } = props;

  const { id, fullName, isMain, orcidId, type, affiliations, biographies } = contribution;

  return (
    <CardListItem
      key={id}
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit contribution"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      <Typography className="cardItem normal-case" variant="h2">
        {fullName}
        {isMain && <StarIcon color="primary" fontSize="small" />}
        {orcidId && <OrcidLink orcidId={orcidId} />}
        {showRecommendations && <Indicator />}
      </Typography>
      <Typography>{convertOptionToString(type)}</Typography>
      {affiliations.length > 0 && (
        <Typography component="ul">
          {affiliations.map(({ id, institutionName, rorId }) => (
            <Typography key={id} component="li" className="cardItem">
              <AccountBalanceIcon fontSize="small" color="primary" />
              {institutionName}
              {rorId && <RorLink rorId={rorId} />}
            </Typography>
          ))}
        </Typography>
      )}
      {biographies.length > 0 && (
        <div className="cardItem">
          <BadgeIcon fontSize="small" color="primary" className="self-start" />
          <MarkdownPreview source={biographies[0].content} />
        </div>
      )}
    </CardListItem>
  );
};
