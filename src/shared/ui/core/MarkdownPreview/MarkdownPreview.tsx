'use client';

import MDEditor from '@uiw/react-md-editor';

type MarkdownPreviewProps = {
  source?: string;
};

const MarkdownPreview = ({ source }: MarkdownPreviewProps) => {
  return (
    <MDEditor.Markdown
      source={source}
      style={{
        whiteSpace: 'pre-wrap',
        width: '100%',
        backgroundColor: 'transparent',
        color: 'var(--color-markdown-text)',
      }}
    />
  );
};

export default MarkdownPreview;
