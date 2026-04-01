import { CardsList } from '@/src/shared/ui';

import { AdditionalResourceEntity } from '../../model/additional-resource.types';
import { AdditionalResourceCardListItem } from './components/AdditionalResourceCardListItem';

type AdditionalResourcesListProps = {
  activeAdditionalResource: AdditionalResourceEntity | null;
  additionalResources: AdditionalResourceEntity[];
  form?: Readonly<React.ReactNode>;
  loading?: boolean;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDragEnd?: (data: AdditionalResourceEntity[]) => void;
};

const AdditionalResourcesList = (props: AdditionalResourcesListProps) => {
  const {
    activeAdditionalResource,
    additionalResources,
    form,
    loading = false,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
    onDragEnd,
  } = props;

  if (additionalResources.length === 0) return null;

  return (
    <CardsList
      items={additionalResources}
      draggable={additionalResources.length > 1}
      loading={loading}
      onDragEnd={onDragEnd}
    >
      {(draggable) => (
        <>
          {additionalResources.map((resource) => (
            <AdditionalResourceCardListItem
              key={resource.id}
              additionalResource={resource}
              draggable={draggable}
              editing={activeAdditionalResource?.id === resource.id}
              form={form}
              editDisabled={editDisabled}
              deleteLoading={deleteLoading}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </CardsList>
  );
};

export default AdditionalResourcesList;
