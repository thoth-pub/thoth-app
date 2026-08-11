/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appConfig } from '@/src/shared/config';
import { ERRORS, NOTIFICATIONS } from '@/src/shared/constants';

import EditFeaturedVideoFile from './EditFeaturedVideoFile';

const mocks = vi.hoisted(() => ({ copyToClipboard: vi.fn(), sendErrorNotification: vi.fn() }));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({ sendErrorNotification: mocks.sendErrorNotification }),
}));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({
    t: (key: string, options?: { filename?: string; progress?: number }) =>
      options?.filename
        ? `${key}:${options.filename}`
        : options?.progress !== undefined
          ? `${key}:${options.progress}`
          : key,
  }),
}));

vi.mock('react-use', () => ({ useCopyToClipboard: () => [null, mocks.copyToClipboard] }));

const makeFile = (name: string, type: string, size = 7000) => new File([new Uint8Array(size)], name, { type });

const dropFile = (dropzone: HTMLElement, file: File) => {
  const event = createEvent.drop(dropzone);
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
  fireEvent(dropzone, event);
};

const renderField = (overrides: Partial<React.ComponentProps<typeof EditFeaturedVideoFile>> = {}) => {
  const onSubmit = vi.fn();
  const result = render(<EditFeaturedVideoFile disabled={false} loading={false} onSubmit={onSubmit} {...overrides} />);

  return {
    ...result,
    dropzone: result.container.querySelector('[data-drag-active]') as HTMLElement,
    input: result.container.querySelector('input[type="file"]') as HTMLInputElement,
    onSubmit,
  };
};

describe('EditFeaturedVideoFile', () => {
  beforeEach(() => {
    mocks.copyToClipboard.mockClear();
    mocks.sendErrorNotification.mockClear();
  });
  afterEach(cleanup);

  it('accepts valid browse and drop replacements', () => {
    const { dropzone, input, onSubmit } = renderField();
    const first = makeFile('first.mp4', 'video/mp4');
    const replacement = makeFile('replacement.webm', 'video/webm');

    fireEvent.change(input, { target: { files: [first] } });
    dropFile(dropzone, replacement);

    expect(onSubmit).toHaveBeenNthCalledWith(1, first);
    expect(onSubmit).toHaveBeenNthCalledWith(2, replacement);
  });

  it('rejects invalid MIME and size bounds', () => {
    const { input, onSubmit } = renderField();

    fireEvent.change(input, { target: { files: [makeFile('book.pdf', 'application/pdf')] } });
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.FILE_FORMAT_INVALID);

    fireEvent.change(input, { target: { files: [makeFile('tiny.mp4', 'video/mp4', 10)] } });
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MIN_FILE_SIZE_NOT_MET);

    const oversized = makeFile('oversized.mp4', 'video/mp4');
    Object.defineProperty(oversized, 'size', { value: appConfig.maxFeaturedVideoFileSize + 1 });
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MAX_FILE_SIZE_EXCEEDED);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks both browse and drop without dimensions', () => {
    const { dropzone, onSubmit } = renderField({ disabled: true });
    const file = makeFile('video.mp4', 'video/mp4');

    fireEvent.click(screen.getByRole('button', { name: 'fileUpload.browse' }));
    dropFile(dropzone, file);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(2);
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(NOTIFICATIONS.FEATURED_VIDEO_UPLOAD_FILE_DISABLED);
  });

  it('uses the canonical hosted URL for copy and open', () => {
    const fileUrl = 'https://cdn.example.org/current.mp4';
    renderField({ fileUrl });

    fireEvent.click(screen.getByRole('button', { name: 'fileUpload.copyUrl' }));
    expect(mocks.copyToClipboard).toHaveBeenCalledWith(fileUrl);
    expect(screen.getByRole('link', { name: 'fileUpload.openDownload' })).toHaveAttribute('href', fileUrl);
  });

  it('renders a selected add-flow file as pending, not uploaded', () => {
    renderField({ pendingFileName: 'pending.mp4' });

    expect(screen.getByText('fileUpload.selected:pending.mp4')).toBeInTheDocument();
    expect(screen.getByText('featuredVideoFile.pending')).toBeInTheDocument();
    expect(screen.queryByText('fileUpload.uploaded')).not.toBeInTheDocument();
  });

  it('shows upload-specific progress', () => {
    renderField({ loading: true, pendingFileName: 'pending.mp4', progress: 68 });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('fileUpload.uploadingProgress:68')).toBeInTheDocument();
  });
});
