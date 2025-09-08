'use client';

import './styles.css';

import CheckIcon from '@mui/icons-material/Check';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import MDEditor from '@uiw/react-md-editor';

import { IconButton } from '@/components';
import { TextEditorTag } from '@/constants';

import { MarkdownEditorToolbar } from './components/MarkdownEditorToolbar';
import { useMarkdownEditor } from './hooks';

export type MarkdownEditorProps = Partial<{
  value: string;
  disableLineBreaks: boolean;
  onChange: (value?: string) => void;
  onSave: () => void;
}>;

const { BOLD, ITALIC, STRIKETHROUGH, UNDERLINE } = TextEditorTag;

export const MarkdownEditor = ({ value, disableLineBreaks = false, onChange, onSave }: MarkdownEditorProps) => {
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
      <MarkdownEditorToolbar
        onBoldPressed={() => customizeText(BOLD)}
        onItalicPressed={() => customizeText(ITALIC)}
        onStrikethroughPressed={() => customizeText(STRIKETHROUGH)}
        onUnderlinePressed={() => customizeText(UNDERLINE)}
      />
    </>
  );
};
