import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

import { CardListItem, DeleteButton, Indicator, RorLink, Typography } from '@/src/shared/ui';

import { FundingEntity } from '../../../model/funding.types';

type FundingsCardListItemProps = {
  funding: FundingEntity;
  editing: boolean;
  form: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  showRecommendations?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const FundingsCardListItem = (props: FundingsCardListItemProps) => {
  const {
    funding,
    editing,
    form,
    editDisabled = false,
    showRecommendations = false,
    deleteLoading = false,
    onDelete,
    onEdit,
  } = props;

  const { id, grantNumber, institutionName, institutionRor } = funding;

  return (
    <CardListItem
      id={id}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit funding"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      {institutionName.length > 0 && (
        <Typography className="cardItem normal-case">
          <AccountBalanceIcon fontSize="small" color="primary" />
          {institutionName}{' '}
          {institutionRor && <RorLink rorId={institutionRor} />}
          {showRecommendations && grantNumber.length === 0 && <Indicator />}
        </Typography>
      )}
    </CardListItem>
  );
};
