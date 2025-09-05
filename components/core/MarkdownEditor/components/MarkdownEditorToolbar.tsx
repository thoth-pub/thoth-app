'use client';

import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';

import { ButtonGroup, IconButton } from '@/components';

type MarkdownEditorToolbarProps = Partial<{
  onBoldPressed: (data: unknown) => void;
  onItalicPressed: (data: unknown) => void;
  onStrikethroughPressed: (data: unknown) => void;
  onUnderlinePressed: (data: unknown) => void;
}>;

export const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { onBoldPressed, onItalicPressed, onStrikethroughPressed, onUnderlinePressed } = props;

  return (
    <ButtonGroup className="mr-16 h-5 self-end border-transparent">
      <IconButton size="small" onClick={onBoldPressed}>
        <FormatBoldIcon />
      </IconButton>
      <IconButton size="small" onClick={onItalicPressed}>
        <FormatItalicIcon />
      </IconButton>
      <IconButton size="small" onClick={onStrikethroughPressed}>
        <FormatStrikethroughIcon />
      </IconButton>
      <IconButton size="small" onClick={onUnderlinePressed}>
        <FormatUnderlinedIcon />
      </IconButton>
    </ButtonGroup>
  );
};
