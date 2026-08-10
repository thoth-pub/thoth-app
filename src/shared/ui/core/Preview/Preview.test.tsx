import { ThemeProvider } from '@mui/material';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import Preview from './Preview';
import PreviewEditBlockedContext from './PreviewEditBlockedContext';

vi.mock('@/src/shared/hooks/useIsDeutchLocale', () => ({
  default: () => false,
}));

vi.mock('../TranslatedContent/TranslatedContent', () => ({
  default: ({ content }: { content: string }) => content,
}));

describe('Preview', () => {
  it('keeps a temporarily blocked edit control interactive but exposes aria-disabled', () => {
    const onEdit = vi.fn();
    const { container } = render(
      <ThemeProvider theme={theme}>
        <PreviewEditBlockedContext value>
          <Preview value="Saved value" onEdit={onEdit} />
        </PreviewEditBlockedContext>
      </ThemeProvider>,
    );

    const button = container.querySelector('[data-testid="EditIcon"]')!.closest('button')!;
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(button);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('keeps a permanently disabled edit control native-disabled without invoking its handler', () => {
    const onEdit = vi.fn();
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Preview value="Saved value" disabled onEdit={onEdit} />
      </ThemeProvider>,
    );

    const button = container.querySelector('[data-testid="EditIcon"]')!.closest('button')!;
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-disabled');

    fireEvent.click(button);

    expect(onEdit).not.toHaveBeenCalled();
  });
});
