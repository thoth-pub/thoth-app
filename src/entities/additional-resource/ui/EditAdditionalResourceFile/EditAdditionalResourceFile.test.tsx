/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appConfig } from '@/src/shared/config';
import { ERRORS, NOTIFICATIONS } from '@/src/shared/constants';

import EditAdditionalResourceFile from './EditAdditionalResourceFile';

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

const renderField = (overrides: Partial<React.ComponentProps<typeof EditAdditionalResourceFile>> = {}) => {
  const onSubmit = vi.fn();
  const result = render(
    <EditAdditionalResourceFile
      loading={false}
      onSubmit={onSubmit}
      resourceType="DOCUMENT"
      title="Supplement"
      {...overrides}
    />,
  );

  return {
    ...result,
    dropzone: result.container.querySelector('[data-drag-active]') as HTMLElement,
    input: result.container.querySelector('input[type="file"]') as HTMLInputElement,
    onSubmit,
  };
};

describe('EditAdditionalResourceFile', () => {
  beforeEach(() => {
    mocks.copyToClipboard.mockClear();
    mocks.sendErrorNotification.mockClear();
  });
  afterEach(cleanup);

  it('accepts valid browse and drop selections', () => {
    const { dropzone, input, onSubmit } = renderField();
    const first = makeFile('first.pdf', 'application/pdf');
    const replacement = makeFile('replacement.pdf', 'application/pdf');

    fireEvent.change(input, { target: { files: [first] } });
    dropFile(dropzone, replacement);

    expect(onSubmit).toHaveBeenNthCalledWith(1, first);
    expect(onSubmit).toHaveBeenNthCalledWith(2, replacement);
  });

  it('rejects invalid MIME types from browse and drop', () => {
    const { dropzone, input, onSubmit } = renderField();
    const invalid = makeFile('video.mp4', 'video/mp4');

    fireEvent.change(input, { target: { files: [invalid] } });
    dropFile(dropzone, invalid);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenNthCalledWith(1, ERRORS.FILE_FORMAT_INVALID);
    expect(mocks.sendErrorNotification).toHaveBeenNthCalledWith(2, ERRORS.FILE_FORMAT_INVALID);
  });

  it('enforces configured minimum and maximum sizes', () => {
    const { input, onSubmit } = renderField();

    fireEvent.change(input, { target: { files: [makeFile('tiny.pdf', 'application/pdf', 10)] } });
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MIN_FILE_SIZE_NOT_MET);

    const oversized = makeFile('oversized.pdf', 'application/pdf');
    Object.defineProperty(oversized, 'size', { value: appConfig.maxAdditionalResourceFileSize + 1 });
    fireEvent.change(input, { target: { files: [oversized] } });

    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MAX_FILE_SIZE_EXCEEDED);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    { title: '', resourceType: 'DOCUMENT' },
    { title: 'Supplement', resourceType: 'LINK' },
  ])('blocks browse and drop when prerequisites are missing', ({ title, resourceType }) => {
    const { dropzone, onSubmit } = renderField({ title, resourceType });
    const file = makeFile('book.pdf', 'application/pdf');

    fireEvent.click(screen.getByRole('button', { name: 'fileUpload.browse' }));
    dropFile(dropzone, file);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(2);
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(NOTIFICATIONS.ADDITIONAL_RESOURCE_UPLOAD_FILE_DISABLED);
  });

  it('renders and acts on the current canonical hosted URL', () => {
    const fileUrl = 'https://cdn.example.org/current.pdf';
    renderField({ fileUrl });

    fireEvent.click(screen.getByRole('button', { name: 'fileUpload.copyUrl' }));
    expect(mocks.copyToClipboard).toHaveBeenCalledWith(fileUrl);

    const link = screen.getByRole('link', { name: 'fileUpload.openDownload' });
    expect(link).toHaveAttribute('href', fileUrl);
    expect(link).toHaveAttribute('download', fileUrl);
  });

  it('renders a selected add-flow file as pending, not uploaded', () => {
    renderField({ pendingFileName: 'pending.pdf' });

    expect(screen.getByText('fileUpload.selected:pending.pdf')).toBeInTheDocument();
    expect(screen.getByText('additionalResourceFile.pending')).toBeInTheDocument();
    expect(screen.queryByText('fileUpload.uploaded')).not.toBeInTheDocument();
  });

  it('shows upload-specific progress', () => {
    renderField({ loading: true, pendingFileName: 'pending.pdf', progress: 35 });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('fileUpload.uploadingProgress:35')).toBeInTheDocument();
  });
});
