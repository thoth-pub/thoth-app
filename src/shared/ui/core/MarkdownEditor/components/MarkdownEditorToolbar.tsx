'use client';

import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatLinkIcon from '@mui/icons-material/Link';

import { ButtonGroup, IconButton } from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

type MarkdownEditorToolbarProps = Partial<{
  className: string;
  isExtended: boolean;
  onBoldPressed: (data: unknown) => void;
  onItalicPressed: (data: unknown) => void;
  onStrikethroughPressed: (data: unknown) => void;
  onUnderlinePressed: (data: unknown) => void;
  onLinkPressed: (data: unknown) => void;
  onUnorderedListPressed: (data: unknown) => void;
  onOrderedListPressed: (data: unknown) => void;
  onToggleTextCasePressed: () => void;
  onAddParagraphPressed: () => void;
}>;

export const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const {
    className,
    isExtended,
    onBoldPressed,
    onItalicPressed,
    onStrikethroughPressed,
    onUnderlinePressed,
    onLinkPressed,
    onUnorderedListPressed,
    onOrderedListPressed,
    onToggleTextCasePressed,
    onAddParagraphPressed,
  } = props;

  const iconSize = 'small';

  return (
    <ButtonGroup className={mergeStyles('h-5 self-end border-transparent', className)}>
      <IconButton size={iconSize} onClick={onBoldPressed}>
        <FormatBoldIcon />
      </IconButton>
      <IconButton size={iconSize} onClick={onItalicPressed}>
        <FormatItalicIcon />
      </IconButton>
      <IconButton size={iconSize} onClick={onStrikethroughPressed}>
        <FormatStrikethroughIcon />
      </IconButton>
      <IconButton size={iconSize} onClick={onUnderlinePressed}>
        <FormatUnderlinedIcon />
      </IconButton>
      {isExtended && (
        <>
          <IconButton size={iconSize} onClick={onLinkPressed}>
            <FormatLinkIcon />
          </IconButton>
          <IconButton size={iconSize} onClick={onUnorderedListPressed}>
            <FormatListBulletedIcon />
          </IconButton>
          <IconButton size={iconSize} onClick={onOrderedListPressed}>
            <FormatListNumberedIcon />
          </IconButton>
          <IconButton size={iconSize} onClick={onToggleTextCasePressed}>
            <img src="/letter-case-toggle.svg" alt="toggle text case" />
          </IconButton>
          <IconButton size={iconSize} onClick={onAddParagraphPressed}>
            <img src="/pilcrow.svg" alt="add a paragraph" />
          </IconButton>
        </>
      )}
    </ButtonGroup>
  );
};
