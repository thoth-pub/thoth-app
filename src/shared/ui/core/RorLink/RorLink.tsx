import { convertRorIdToText } from '@/src/shared/utils';

import RorLogo from '../../icons/RorLogo/RorLogo';
import LinkTooltip from '../LinkTooltip/LinkTooltip';

type RorLinkProps = {
  rorId: string;
};

const RorLink = ({ rorId }: RorLinkProps) => {
  return (
    <LinkTooltip link={rorId} linkText={convertRorIdToText(rorId)}>
      <RorLogo />
    </LinkTooltip>
  );
};

export default RorLink;
