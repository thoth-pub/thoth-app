import Typography from '../Typography/Typography';
import LinkTooltip from '../LinkTooltip/LinkTooltip';
import DoiLogo from '../../icons/DoiLogo/DoiLogo';
import { convertDoiToText } from '@/src/shared/utils/convertations/formFields';

type DoiPreviewProps = {
  doi?: string;
};

const DoiPreview = (props: DoiPreviewProps) => {
  const { doi = '' } = props;

  return (
    <div className="flex items-center gap-1">
      <Typography>{convertDoiToText(doi)}</Typography>
      <LinkTooltip link={doi} linkText={convertDoiToText(doi)}>
        <DoiLogo />
      </LinkTooltip>
    </div>
  );
};

export default DoiPreview;
