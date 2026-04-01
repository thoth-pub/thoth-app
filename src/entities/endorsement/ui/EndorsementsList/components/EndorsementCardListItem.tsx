import LinkIcon from '@mui/icons-material/Link';

import { CardListItem, DeleteButton, LinkTooltip, OrchidLogo, RorLogo, Typography } from '@/src/shared/ui';
import { convertOrchidIdToText, convertRorIdToText } from '@/src/shared/utils';

import { EndorsementEntity } from '../../../model/endorsement.types';

type EndorsementCardListItemProps = {
  endorsement: EndorsementEntity;
  draggable?: boolean;
  editing: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const EndorsementCardListItem = (props: EndorsementCardListItemProps) => {
  const {
    endorsement,
    draggable,
    editing,
    form,
    editDisabled = false,
    deleteLoading = false,
    onDelete,
    onEdit,
  } = props;

  const { id, authorName, authorOrcid, authorRole, authorInstitutionRor, url } = endorsement;

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit endorsement"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      {authorName.length > 0 && (
        <Typography className="cardItem normal-case">
          {authorName} {authorRole.length > 0 && `(${authorRole})`}{' '}
          {url.length > 0 && (
            <LinkTooltip link={url} linkText={url}>
              <LinkIcon fontSize="small" color="primary" />
            </LinkTooltip>
          )}
          {authorOrcid && (
            <LinkTooltip link={authorOrcid} linkText={convertOrchidIdToText(authorOrcid)}>
              <OrchidLogo />
            </LinkTooltip>
          )}
          {authorInstitutionRor && (
            <LinkTooltip link={authorInstitutionRor} linkText={convertRorIdToText(authorInstitutionRor)}>
              <RorLogo />
            </LinkTooltip>
          )}
        </Typography>
      )}
    </CardListItem>
  );
};
