'use client';

import MDEditor from '@uiw/react-md-editor';

import { useIsDesktop } from '@/src/shared/hooks';

type MarkdownPreviewProps = {
  source?: string;
};

const MarkdownPreview = ({ source }: MarkdownPreviewProps) => {
  const isDesktop = useIsDesktop();

  return (
    <MDEditor.Markdown
      source={source}
      style={{
        whiteSpace: 'pre-wrap',
        width: '100%',
        backgroundColor: 'transparent',
        color: 'var(--color-markdown-text)',
        fontSize: isDesktop ? '1rem' : '0.75rem',
      }}
    />
  );
};

export default MarkdownPreview;
