'use client';

import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';

import { ButtonGroup, IconButton } from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

type MarkdownEditorToolbarProps = Partial<{
  className: string;
  onBoldPressed: (data: unknown) => void;
  onItalicPressed: (data: unknown) => void;
  onStrikethroughPressed: (data: unknown) => void;
  onUnderlinePressed: (data: unknown) => void;
}>;

export const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { className, onBoldPressed, onItalicPressed, onStrikethroughPressed, onUnderlinePressed } = props;

  return (
    <ButtonGroup className={mergeStyles('h-5 self-end border-transparent', className)}>
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
