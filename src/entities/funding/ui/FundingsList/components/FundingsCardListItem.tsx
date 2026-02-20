import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SchoolIcon from '@mui/icons-material/School';

import { convertRorIdToText } from '@/src/shared';
import {
  ButtonGroup,
  CardListItem,
  DeleteButton,
  EditButton,
  Indicator,
  LinkTooltip,
  RorLogo,
  Typography,
} from '@/src/shared/ui';

import { FundingEntity } from '../../../model/funding.types';

type FundingsCardListItemProps = {
  funding: FundingEntity;
  editing: boolean;
  form: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  showRecommendations?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const FundingsCardListItem = (props: FundingsCardListItemProps) => {
  const { funding, editing, form, editDisabled = false, showRecommendations = false, onDelete, onEdit } = props;

  const { id, projectName, projectShortname, grantNumber, program, institutionName, institutionRor } = funding;

  return (
    <CardListItem
      id={id}
      editing={editing}
      form={form}
      actions={
        <ButtonGroup>
          <EditButton onClick={() => onEdit?.(id)} disabled={editDisabled} />
          <DeleteButton onClick={() => onDelete?.(id)} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="cardItem normal-case">
        <AssuredWorkloadIcon fontSize="small" color="primary" />
        {projectName} {projectShortname && `(${projectShortname})`}
        {showRecommendations && grantNumber.length === 0 && <Indicator />}
      </Typography>
      {program.length > 0 && (
        <Typography className="cardItem">
          <SchoolIcon fontSize="small" color="primary" />
          {program}
        </Typography>
      )}
      {institutionName.length > 0 && (
        <Typography className="cardItem">
          <AccountBalanceIcon fontSize="small" color="primary" />
          {institutionName}{' '}
          {institutionRor && (
            <LinkTooltip link={institutionRor} linkText={convertRorIdToText(institutionRor)}>
              <RorLogo />
            </LinkTooltip>
          )}
        </Typography>
      )}
      {grantNumber.length > 0 && (
        <Typography className="cardItem">
          <RequestQuoteIcon fontSize="small" color="primary" />
          {grantNumber}
        </Typography>
      )}
    </CardListItem>
  );
};
