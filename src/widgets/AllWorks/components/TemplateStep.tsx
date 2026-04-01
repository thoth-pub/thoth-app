'use client';

import DownloadIcon from '@mui/icons-material/Download';

import { Link, TranslatedContent } from '@/src/shared/ui';

export const TemplateStep = () => {
  return (
    <div className="m-auto flex items-center gap-(--default-gap)">
      <Link href="/templates/template.csv" target="_blank" download="template.csv" className="no-underline">
        <DownloadIcon color="primary" fontSize="small" />
        CSV <TranslatedContent content="template" />
      </Link>
      <Link href="/templates/template.xml" target="_blank" download="template.xml" className="no-underline">
        <DownloadIcon color="primary" fontSize="small" />
        ONIX <TranslatedContent content="template" />
      </Link>
    </div>
  );
};
