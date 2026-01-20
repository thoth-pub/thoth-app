'use client';

import MDEditor from '@uiw/react-md-editor';

const MarkdownRenderer = ({ markdown }: { markdown: string }) => {
  return (
    <MDEditor.Markdown
      source={markdown}
      style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', textTransform: 'inherit' }}
    />
  );
};

export default MarkdownRenderer;
