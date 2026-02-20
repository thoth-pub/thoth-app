import EditSquareIcon from '@mui/icons-material/EditSquare';
import PersonIcon from '@mui/icons-material/Person';
import PlusOneIcon from '@mui/icons-material/PlusOne';
import TranslateIcon from '@mui/icons-material/Translate';
import UpdateIcon from '@mui/icons-material/Update';

import { WorkStatusChip } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { convertOptionToString, convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared';
import {
  ButtonGroup,
  CardListItem,
  IconButton,
  ImageWithFallback,
  MarkdownRenderer,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

type WorkCardListItemProps = {
  work: WorkEntity;
  createNewEdition?: (work: WorkEntity) => void;
  createTranslation?: (work: WorkEntity) => void;
  navigateToWork?: (id: string) => void;
};

export const WorkCardListItem = (props: WorkCardListItemProps) => {
  const { work, createNewEdition, createTranslation, navigateToWork } = props;

  const { id, reference, titles, status, type, contributorsNames, updatedAt, coverUrl } = work;

  return (
    <CardListItem
      id={work.id}
      draggable={false}
      actions={
        <ButtonGroup>
          <IconButton onClick={() => createNewEdition?.(work)}>
            <PlusOneIcon />
          </IconButton>
          <IconButton onClick={() => createTranslation?.(work)}>
            <TranslateIcon />
          </IconButton>
          <IconButton onClick={() => navigateToWork?.(id)}>
            <EditSquareIcon />
          </IconButton>
        </ButtonGroup>
      }
    >
      <div className="flex gap-2">
        <ImageWithFallback src={coverUrl ?? ''} alt="cover" width={100} height={150} className="max-h-[150px]" />

        <Typography variant="h2" className="flex flex-col gap-1 normal-case">
          <WorkStatusChip status={status} className="w-fit" />
          <MarkdownRenderer markdown={getMainTitle(titles).title} />
          <Typography component="span">{reference}</Typography>
          <Typography className="capitalize" component="span">
            {<TranslatedContent content={convertOptionToString(type).toLowerCase()} />}
          </Typography>
        </Typography>
      </div>

      {contributorsNames.length > 0 && (
        <li>
          {contributorsNames.map((name, index) => (
            <Typography key={index} className="cardItem">
              <PersonIcon fontSize="small" color="primary" />
              {name}
            </Typography>
          ))}
        </li>
      )}
      <Typography className="cardItem">
        <UpdateIcon fontSize="small" color="primary" />
        {convertUpdatedAtToFormattedDate(updatedAt)}
      </Typography>
    </CardListItem>
  );
};
