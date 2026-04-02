import { convertOrchidIdToText } from '@/src/shared/utils';
import { normalizedOrcidId } from '@/src/shared/utils/helpers/normalizedOrcidId';

import OrcidLogo from '../../icons/OrcidLogo/OrcidLogo';
import LinkTooltip from '../LinkTooltip/LinkTooltip';

type OrcidLinkProps = {
  orcidId: string;
};

const OrcidLink = ({ orcidId }: OrcidLinkProps) => {
  return (
    <LinkTooltip link={normalizedOrcidId(orcidId) ?? ''} linkText={convertOrchidIdToText(orcidId)}>
      <OrcidLogo />
    </LinkTooltip>
  );
};

export default OrcidLink;
