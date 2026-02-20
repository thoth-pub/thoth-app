import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BadgeIcon from '@mui/icons-material/Badge';
import StarIcon from '@mui/icons-material/Star';

import { convertOptionToString, convertOrchidIdToText, convertRorIdToText } from '@/src/shared';
import {
  ButtonGroup,
  CardListItem,
  DeleteButton,
  EditButton,
  Indicator,
  LinkTooltip,
  MarkdownPreview,
  OrchidLogo,
  RorLogo,
  Typography,
} from '@/src/shared/ui';

import type { WorkContribution } from '../../../model/contribution.types';

type ContributionListItemProps = {
  contribution: WorkContribution;
  draggable?: boolean;
  showRecommendations?: boolean;
  editing?: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
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
  } = props;

  const { id, fullName, isMain, orcidId, type, affiliations, biographies } = contribution;

  return (
    <CardListItem
      key={id}
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      actions={
        <ButtonGroup>
          <EditButton onClick={() => onEdit?.(id)} disabled={editDisabled} />
          <DeleteButton onClick={() => onDelete?.(id)} />
        </ButtonGroup>
      }
    >
      <Typography className="cardItem normal-case" variant="h2">
        {fullName}
        {isMain && <StarIcon color="primary" fontSize="small" />}
        {orcidId && (
          <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
            <OrchidLogo />
          </LinkTooltip>
        )}
        {showRecommendations && <Indicator />}
      </Typography>
      <Typography className="text-sm">{convertOptionToString(type)}</Typography>
      {affiliations.length > 0 && (
        <Typography className="text-sm" component="ul">
          {affiliations.map(({ id, institutionName, rorId }) => (
            <li key={id} className="cardItem">
              <AccountBalanceIcon fontSize="small" color="primary" />
              {institutionName}
              {rorId && (
                <LinkTooltip link={rorId} linkText={convertRorIdToText(rorId)}>
                  <RorLogo />
                </LinkTooltip>
              )}
            </li>
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
