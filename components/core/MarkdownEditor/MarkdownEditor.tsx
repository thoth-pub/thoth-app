'use client';

import './styles.css';

import MDEditor from '@uiw/react-md-editor';
import type { ReactNode } from 'react';

import { Typography } from '@/components';
import { TextEditorTag } from '@/constants';

import { MarkdownEditorToolbar } from './components/MarkdownEditorToolbar';
import { useMarkdownEditor } from './hooks';

export type MarkdownEditorProps = Partial<{
  value: string;
  error: boolean;
  errorMessage: string;
  disableLineBreaks: boolean;
  children: Readonly<ReactNode>;
  onChange: (value?: string) => void;
}>;

const { BOLD, ITALIC, STRIKETHROUGH, UNDERLINE } = TextEditorTag;

export const MarkdownEditor = (props: MarkdownEditorProps) => {
  const { value, error, errorMessage, disableLineBreaks = false, children, onChange } = props;
  const { editorRef, customizeText, update } = useMarkdownEditor({ disableLineBreaks, onChange });

  return (
    <div className="flex flex-1 flex-col gap-1">
      <MDEditor
        hideToolbar
        value={value}
        onChange={update}
        height="100%"
        minHeight={50}
        visibleDragbar={false}
        preview="edit"
        className={error ? 'error' : ''}
        style={{
          width: '100%',
          maxWidth: 'var(--max-content-width)',
          backgroundColor: 'var(--color-markdown-background)',
          color: 'var(--color-markdown-text)',
        }}
        inputMode="text"
        ref={editorRef}
      />
      <div className="flex flex-1 justify-between">
        <MarkdownEditorToolbar
          className="self-start"
          onBoldPressed={() => customizeText(BOLD)}
          onItalicPressed={() => customizeText(ITALIC)}
          onStrikethroughPressed={() => customizeText(STRIKETHROUGH)}
          onUnderlinePressed={() => customizeText(UNDERLINE)}
        />
        {children}
      </div>
      {error && (
        <Typography variant="body2" color="error">
          {errorMessage}
        </Typography>
      )}
    </div>
  );
};
