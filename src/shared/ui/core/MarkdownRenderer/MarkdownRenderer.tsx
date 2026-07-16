'use client';

import MDEditor from '@uiw/react-md-editor';

import { jatsToHtml } from '@/src/shared/utils/jats';
import { sanitizeHtml } from '@/src/shared/utils/sanitize';
import { escapeMarkdownList } from '@/src/shared/utils/strings';

const MarkdownRenderer = ({ markdown }: { markdown: string }) => {
  return (
    <MDEditor.Markdown
      source={escapeMarkdownList(sanitizeHtml(jatsToHtml(markdown)))}
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
