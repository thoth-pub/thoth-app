'use client';

import DownloadIcon from '@mui/icons-material/Download';

import { Link } from '@/src/shared/ui';

export const TemplateStep = () => {
  return (
    <div className="m-auto flex items-center gap-[var(--default-gap)]">
      <Link href="/templates/template.csv" target="_blank" download="template.csv" className="no-underline">
        <DownloadIcon color="primary" fontSize="small" />
        CSV template
      </Link>
      <Link href="/templates/template.xml" target="_blank" download="template.xml" className="no-underline">
        <DownloadIcon color="primary" fontSize="small" />
        ONIX template
      </Link>
    </div>
  );
};
