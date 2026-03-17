import type { SvgIconComponent } from '@mui/icons-material';
import Article from '@mui/icons-material/Article';
import AudioFile from '@mui/icons-material/AudioFile';
import Description from '@mui/icons-material/Description';
import Image from '@mui/icons-material/Image';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import Language from '@mui/icons-material/Language';
import LinkIcon from '@mui/icons-material/Link';
import Map from '@mui/icons-material/Map';
import MenuBook from '@mui/icons-material/MenuBook';
import RssFeed from '@mui/icons-material/RssFeed';
import Source from '@mui/icons-material/Source';
import Storage from '@mui/icons-material/Storage';
import TableChart from '@mui/icons-material/TableChart';
import Videocam from '@mui/icons-material/Videocam';

import { ResourceType } from '@/gql/graphql';
import { CardListItem, DeleteButton, DoiPreview, LinkTooltip, MarkdownRenderer, Typography } from '@/src/shared/ui';

import { AdditionalResourceEntity } from '../../../model/additional-resource.types';

const resourceTypeIcons: Record<string, SvgIconComponent> = {
  [ResourceType.Article]: Article,
  [ResourceType.Audio]: AudioFile,
  [ResourceType.Blog]: RssFeed,
  [ResourceType.Book]: MenuBook,
  [ResourceType.Dataset]: Storage,
  [ResourceType.Document]: Description,
  [ResourceType.Image]: Image,
  [ResourceType.Map]: Map,
  [ResourceType.Other]: InsertDriveFile,
  [ResourceType.Source]: Source,
  [ResourceType.Spreadsheet]: TableChart,
  [ResourceType.Video]: Videocam,
  [ResourceType.Website]: Language,
};

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
  const Icon = resourceTypeIcons[resourceType] ?? InsertDriveFile;

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
          <Icon fontSize="small" color="primary" />
          <MarkdownRenderer markdown={title} />
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
