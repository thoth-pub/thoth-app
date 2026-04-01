import { mergeStyles } from '@/src/shared/utils';
import { convertDoiToText } from '@/src/shared/utils/convertations/formFields';

import DoiLogo from '../../icons/DoiLogo/DoiLogo';
import LinkTooltip from '../LinkTooltip/LinkTooltip';
import Typography from '../Typography/Typography';

type DoiPreviewProps = Partial<{
  doi: string;
  className: string;
}>;

const DoiPreview = (props: DoiPreviewProps) => {
  const { doi = '', className = '' } = props;

  return (
    <div className={mergeStyles('flex items-center gap-1', className)}>
      <Typography>{convertDoiToText(doi)}</Typography>
      <LinkTooltip link={doi} linkText={convertDoiToText(doi)}>
        <DoiLogo />
      </LinkTooltip>
    </div>
  );
};

export default DoiPreview;
