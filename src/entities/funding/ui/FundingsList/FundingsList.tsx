import { CardsList } from '@/src/shared/ui';

import { FundingEntity } from '../../model/funding.types';
import { FundingsCardListItem } from './components/FundingsCardListItem';

type FundingsListProps = {
  activeFunding: FundingEntity | null;
  fundings: FundingEntity[];
  showRecommendations?: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const FundingsList = (props: FundingsListProps) => {
  const {
    activeFunding,
    fundings,
    showRecommendations = false,
    form,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
  } = props;

  return (
    <>
      <CardsList items={fundings}>
        {() => (
          <>
            {fundings.map((funding) => (
              <FundingsCardListItem
                key={funding.id}
                funding={funding}
                editing={activeFunding?.id === funding.id}
                form={form}
                showRecommendations={showRecommendations}
                editDisabled={editDisabled}
                deleteLoading={deleteLoading}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </>
        )}
      </CardsList>
    </>
  );
};

export default FundingsList;
