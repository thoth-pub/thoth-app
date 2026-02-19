'use client';

import MDEditor from '@uiw/react-md-editor';

import { jatsToHtml } from '@/src/shared/utils/jats';

const MarkdownRenderer = ({ markdown }: { markdown: string }) => {
  return (
    <MDEditor.Markdown
      source={jatsToHtml(markdown)}
      style={{
        backgroundColor: 'transparent',
        color: 'inherit',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        textTransform: 'inherit',
      }}
    />
  );
};

export default MarkdownRenderer;
