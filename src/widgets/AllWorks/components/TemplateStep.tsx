'use client';

import DownloadIcon from '@mui/icons-material/Download';
import { Button, Link } from '@/src/shared/ui';

type TemplateStepProps = {
  onTemplateSelect: () => void;
  onSkip: () => void;
};

export const TemplateStep = (props: TemplateStepProps) => {
  const { onTemplateSelect, onSkip } = props;

  return (
    <div className="flex flex-col items-center gap-[var(--default-gap)]">
      <div className="flex items-center gap-[var(--default-gap)]">
        <Link
          href="/templates/template.csv"
          target="_blank"
          download="template.csv"
          className="no-underline"
          onClick={onTemplateSelect}
        >
          <DownloadIcon color="primary" fontSize="small" />
          CSV template
        </Link>
        <Link
          href="/templates/template.xml"
          target="_blank"
          download="template.xml"
          className="no-underline"
          onClick={onTemplateSelect}
        >
          <DownloadIcon color="primary" fontSize="small" />
          ONIX template
        </Link>
      </div>
      <Button onClick={onSkip}>Skip</Button>
    </div>
  );
};
