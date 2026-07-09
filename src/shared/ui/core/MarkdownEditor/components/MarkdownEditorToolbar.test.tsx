import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';

import { MarkdownEditorToolbar } from './MarkdownEditorToolbar';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

describe('MarkdownEditorToolbar', () => {
  it('renders basic formatting buttons', () => {
    const { container } = render(<Wrapper><MarkdownEditorToolbar /></Wrapper>);

    expect(container.querySelector('[data-testid="FormatBoldIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="FormatItalicIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="FormatStrikethroughIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="FormatUnderlinedIcon"]')).toBeTruthy();
  });

  it('does not render extended buttons by default', () => {
    const { container } = render(<Wrapper><MarkdownEditorToolbar /></Wrapper>);

    expect(container.querySelector('[data-testid="LinkIcon"]')).toBeNull();
  });

  it('renders extended buttons when isExtended is true', () => {
    const { container } = render(<Wrapper><MarkdownEditorToolbar isExtended /></Wrapper>);

    expect(container.querySelector('[data-testid="LinkIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="FormatListBulletedIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="FormatListNumberedIcon"]')).toBeTruthy();
    expect(container.querySelector('img[alt="toggle text case"]')).toBeTruthy();
    expect(container.querySelector('img[alt="add a paragraph"]')).toBeTruthy();
  });

  it('calls click handlers when buttons are pressed', () => {
    const onBold = vi.fn();
    const onItalic = vi.fn();

    const { container } = render(
      <Wrapper><MarkdownEditorToolbar onBoldPressed={onBold} onItalicPressed={onItalic} /></Wrapper>,
    );

    container.querySelector('[data-testid="FormatBoldIcon"]')?.parentElement?.click();
    expect(onBold).toHaveBeenCalledTimes(1);

    container.querySelector('[data-testid="FormatItalicIcon"]')?.parentElement?.click();
    expect(onItalic).toHaveBeenCalledTimes(1);
  });
});
