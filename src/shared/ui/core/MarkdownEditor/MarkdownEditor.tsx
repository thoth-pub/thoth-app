'use client';

import './styles.css';

import MDEditor from '@uiw/react-md-editor';
import type { ReactNode } from 'react';

import { TextEditorTag } from '@/src/shared/constants';

import Typography from '../Typography/Typography';
import { MarkdownEditorToolbar } from './components/MarkdownEditorToolbar';
import { useMarkdownEditor } from './hooks/useMarkdownEditor';

export type MarkdownEditorProps = Partial<{
  value: string;
  error: boolean;
  errorMessage: string;
  extendedToolbar?: boolean;
  disableLineBreaks?: boolean;
  maxCharsLimit?: number;
  id?: string;
  children: Readonly<ReactNode>;
  onChange: (value?: string) => void;
}>;

const { BOLD, ITALIC, STRIKETHROUGH, UNDERLINE, LINK, UNORDERED_LIST, ORDERED_LIST, PARAGRAPH } = TextEditorTag;

const MarkdownEditor = (props: MarkdownEditorProps) => {
  const {
    value,
    error,
    errorMessage,
    extendedToolbar = false,
    disableLineBreaks = false,
    maxCharsLimit,
    children,
    onChange,
    id,
  } = props;
  const { editorRef, customizeText, update, toggleTextCase } = useMarkdownEditor({ disableLineBreaks, maxCharsLimit, onChange });

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
        textareaProps={{ id }}
        ref={editorRef}
      />
      <div className="flex flex-1 justify-between">
        <MarkdownEditorToolbar
          className="self-start"
          isExtended={extendedToolbar}
          onBoldPressed={() => customizeText(BOLD)}
          onItalicPressed={() => customizeText(ITALIC)}
          onStrikethroughPressed={() => customizeText(STRIKETHROUGH)}
          onUnderlinePressed={() => customizeText(UNDERLINE)}
          onLinkPressed={() => customizeText(LINK)}
          onUnorderedListPressed={() => customizeText(UNORDERED_LIST)}
          onOrderedListPressed={() => customizeText(ORDERED_LIST)}
          onToggleTextCasePressed={toggleTextCase}
          onAddParagraphPressed={() => customizeText(PARAGRAPH)}
        />
        {children}
        {maxCharsLimit && (
          <Typography
            variant="body2"
            component="span"
            color={value && value.length >= maxCharsLimit ? 'error' : 'textSecondary'}
          >
            {value?.length ?? 0}/{maxCharsLimit}
          </Typography>
        )}
      </div>
      {error && (
        <Typography variant="body2" color="error">
          {errorMessage}
        </Typography>
      )}
    </div>
  );
};

export default MarkdownEditor;
