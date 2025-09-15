'use client';

import MDEditor from '@uiw/react-md-editor';

type MarkdownPreviewProps = {
  isHighlighted?: boolean;
  source: string;
};

const MarkdownPreview = ({ source, isHighlighted = false }: MarkdownPreviewProps) => {
  return (
    <MDEditor.Markdown
      source={source}
      style={{
        whiteSpace: 'pre-wrap',
        width: '100%',
        backgroundColor: 'transparent',
        color: isHighlighted ? 'var(--color-markdown-preview-text-alt)' : 'var(--color-markdown-preview-text)',
      }}
    />
  );
};

export default MarkdownPreview;
