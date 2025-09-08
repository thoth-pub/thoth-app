'use client';

import './styles.css';

import CheckIcon from '@mui/icons-material/Check';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import MDEditor from '@uiw/react-md-editor';
import type { ReactNode } from 'react';

import { IconButton, Typography } from '@/components';
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
  onSave: () => void;
}>;

const { BOLD, ITALIC, STRIKETHROUGH, UNDERLINE } = TextEditorTag;

export const MarkdownEditor = (props: MarkdownEditorProps) => {
  const { value, error, errorMessage, disableLineBreaks = false, children, onChange, onSave } = props;
  const { editorRef, customizeText, update } = useMarkdownEditor({ disableLineBreaks, onChange });

  return (
    <>
      <div className="flex gap-1">
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
        <IconButton
          disabled={error}
          onClick={onSave}
          sx={{
            backgroundColor: 'var(--color-icon-button-medium-background)',
            color: 'var(--color-icon-button-medium-text)',
            borderRadius: '5px',
            '&:hover': {
              backgroundColor: 'var(--color-icon-button-medium-background)',
              opacity: '0.75',
            },
          }}
        >
          <CheckIcon />
        </IconButton>
        <IconButton>
          <InfoOutlineIcon />
        </IconButton>
      </div>
      <div className="mr-18 flex flex-1 justify-between">
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
    </>
  );
};
