import PlusOneIcon from '@mui/icons-material/PlusOne';
import TranslateIcon from '@mui/icons-material/Translate';
import UpdateIcon from '@mui/icons-material/Update';

import { ContributorsChip } from '@/src/entities/contributor/ui';
import { WorkStatusChip } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import {
  ButtonGroup,
  CardListItem,
  IconButton,
  ImageWithFallback,
  MarkdownRenderer,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { convertOptionToString, convertUpdatedAtToFormattedDate, getDisplayTitle } from '@/src/shared/utils';

type WorkCardListItemProps = {
  work: WorkEntity;
  createNewEdition?: (work: WorkEntity) => void;
  createTranslation?: (work: WorkEntity) => void;
  navigateToWork?: (id: string) => void;
};

export const WorkCardListItem = (props: WorkCardListItemProps) => {
  const { work, createNewEdition, createTranslation, navigateToWork } = props;

  const { id, reference, titles, status, type, contributions, updatedAt, coverUrl } = work;

  const contributorsNames = contributions
    .filter((contribution) => contribution.isMain)
    .map((contribution) => contribution.fullName);

  return (
    <CardListItem
      id={work.id}
      draggable={false}
      onEdit={() => navigateToWork?.(id)}
      ariaLabel="Navigate to work"
      actions={
        <ButtonGroup>
          <IconButton onClick={() => createNewEdition?.(work)}>
            <PlusOneIcon />
          </IconButton>
          <IconButton onClick={() => createTranslation?.(work)}>
            <TranslateIcon />
          </IconButton>
        </ButtonGroup>
      }
    >
      <div className="cardWithImageWrapper">
        <ImageWithFallback src={coverUrl ?? ''} alt="cover" width={100} height={150} className="max-h-[150px]" />

        <Typography variant="h2" className="flex flex-col gap-1 normal-case">
          <WorkStatusChip status={status} className="w-fit" />
          <MarkdownRenderer markdown={getDisplayTitle(titles).title} />
          <Typography component="span">{reference}</Typography>
          <Typography className="capitalize" component="span">
            {<TranslatedContent content={convertOptionToString(type).toLowerCase()} />}
          </Typography>
        </Typography>
      </div>

      <ContributorsChip contributors={contributorsNames} />

      <Typography className="cardItem">
        <UpdateIcon fontSize="small" color="primary" />
        {convertUpdatedAtToFormattedDate(updatedAt)}
      </Typography>
    </CardListItem>
  );
};
