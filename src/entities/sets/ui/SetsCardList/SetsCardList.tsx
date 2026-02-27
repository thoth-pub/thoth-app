'use client';

import { CardsList, Pagination } from '@/src/shared/ui';

import { useDeleteSet } from '../../api/hooks/useDeleteSet';
import { SetEntity } from '../../model/set.types';
import { useSetStateMachine } from '../../store/set.store';
import { SetsListCardItem } from './components/SetsListCardItem';

type SetsCardListProps = {
  form: React.ReactNode;
  loading: boolean;
  sets: SetEntity[];
  page: number;
  pagesCount: number;
  onPageChange: (value: number) => void;
};

const SetsCardList = (props: SetsCardListProps) => {
  const { form, loading, sets, page, pagesCount, onPageChange } = props;

  const { activeEntity: activeSet, edit } = useSetStateMachine();

  const { deleteSet } = useDeleteSet();

  return (
    <>
      <CardsList items={sets} loading={loading} backdropClassName="min-h-100" listClassName="min-h-100">
        {() => (
          <>
            {sets.map((set) => (
              <SetsListCardItem
                key={set.id}
                set={set}
                editing={activeSet?.id === set.id}
                disabledControls={!!activeSet}
                form={form}
                onEdit={edit}
                onDelete={deleteSet}
              />
            ))}
          </>
        )}
      </CardsList>

      <Pagination
        page={page}
        count={pagesCount}
        color="primary"
        className="ml-auto"
        showFirstButton
        showLastButton
        onChange={(_, value) => onPageChange(value)}
        disabled={loading}
      />
    </>
  );
};

export default SetsCardList;
