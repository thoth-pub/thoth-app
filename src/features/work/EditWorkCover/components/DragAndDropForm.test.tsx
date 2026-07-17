/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DragAndDropForm from './DragAndDropForm';

vi.mock('./useDragAndDropForm', () => ({
  useDragAndDropForm: () => ({
    isDragStarted: false,
    defaultValue: '',
    loading: false,
    fieldProps: { name: 'coverUrl', onChange: vi.fn(), onBlur: vi.fn() },
    isUrlCoverFilled: false,
    inputRef: { current: null },
    isRemoveDialogOpen: false,
    ref: vi.fn(),
    copyCoverUrlToClipboard: vi.fn(),
    dropFile: vi.fn(),
    uploadFile: vi.fn(),
    uploadFileClick: vi.fn(),
    openRemoveDialog: vi.fn(),
    closeRemoveDialog: vi.fn(),
    confirmRemoveCover: vi.fn(),
  }),
}));

vi.mock('./PlaceholderLogo', () => ({
  PlaceholderLogo: () => <div data-testid="placeholder-logo" />,
}));

vi.mock('./Wrapper', () => ({
  Wrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/src/shared/ui', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  CircularProgress: () => <div />,
  ConfirmDialog: () => null,
  IconButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TranslatedContent: ({ content }: { content: string }) => <span>{content}</span>,
  Typography: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('next/image', () => ({
  default: () => null,
}));

describe('DragAndDropForm', () => {
  it('restricts the file picker to JPEG cover images', () => {
    const { container } = render(<DragAndDropForm workId="work-1" />);

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('accept')).toBe('image/jpeg,.jpg,.jpeg');
  });
});
