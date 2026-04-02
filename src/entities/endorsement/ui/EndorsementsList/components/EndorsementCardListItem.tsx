import LinkIcon from '@mui/icons-material/Link';

import { CardListItem, DeleteButton, LinkTooltip, OrcidLink, RorLink, Typography } from '@/src/shared/ui';

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
          {authorOrcid && <OrcidLink orcidId={authorOrcid} />}
          {authorInstitutionRor && <RorLink rorId={authorInstitutionRor} />}
        </Typography>
      )}
    </CardListItem>
  );
};
