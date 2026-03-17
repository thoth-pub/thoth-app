import ArticleIcon from '@mui/icons-material/Article';
import LinkIcon from '@mui/icons-material/Link';

import { CardListItem, DeleteButton, DoiPreview, LinkTooltip, MarkdownRenderer, Typography } from '@/src/shared/ui';
import { convertOptionToString } from '@/src/shared/utils';

import { AdditionalResourceEntity } from '../../../model/additional-resource.types';

type AdditionalResourceCardListItemProps = {
  additionalResource: AdditionalResourceEntity;
  draggable?: boolean;
  editing: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

// TODO: icon based on resource type
export const AdditionalResourceCardListItem = (props: AdditionalResourceCardListItemProps) => {
  const {
    additionalResource,
    draggable,
    editing,
    form,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
  } = props;

  const { id, title, resourceType, url, doi } = additionalResource;

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit additional resource"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      {title.length > 0 && (
        <Typography className="cardItem normal-case">
          <ArticleIcon fontSize="small" color="primary" />
          <MarkdownRenderer markdown={title} /> {resourceType.length > 0 && `(${convertOptionToString(resourceType)})`}{' '}
          {doi.length > 0 && <DoiPreview doi={doi} />}{' '}
          {url.length > 0 && (
            <LinkTooltip link={url} linkText={url}>
              <LinkIcon fontSize="small" color="primary" />
            </LinkTooltip>
          )}
        </Typography>
      )}
    </CardListItem>
  );
};
