/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HostedFileField from './HostedFileField';

const mocks = vi.hoisted(() => ({ copyToClipboard: vi.fn() }));

vi.mock('react-use', () => ({
  useCopyToClipboard: () => [null, mocks.copyToClipboard],
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) =>
      options?.filename
        ? `${key}:${options.filename}`
        : options?.progress !== undefined
          ? `${key}:${options.progress}`
          : key,
  }),
}));

const validFile = new File(['file'], 'replacement.pdf', { type: 'application/pdf' });

const renderField = (overrides: Partial<React.ComponentProps<typeof HostedFileField>> = {}) => {
  const onFileSelect = vi.fn();
  const result = render(
    <HostedFileField
      accept={['application/pdf']}
      label="Publication file"
      onFileSelect={onFileSelect}
      {...overrides}
    />,
  );

  return {
    ...result,
    dropzone: result.container.querySelector('[data-drag-active]') as HTMLElement,
    input: result.container.querySelector('input[type="file"]') as HTMLInputElement,
    onFileSelect,
  };
};

describe('HostedFileField', () => {
  beforeEach(() => mocks.copyToClipboard.mockClear());
  afterEach(cleanup);

  it('renders selected files as pending rather than uploaded', () => {
    renderField({ pendingFileName: 'pending.pdf' });

    expect(screen.getByText('fileUpload.selected:pending.pdf')).toBeDefined();
    expect(screen.getByText('fileUpload.pending')).toBeDefined();
    expect(screen.queryByText('fileUpload.uploaded')).toBeNull();
  });

  it('renders upload progress without an uploaded claim', () => {
    renderField({ loading: true, pendingFileName: 'pending.pdf', progress: 42 });

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('fileUpload.uploadingProgress:42')).toBeDefined();
    expect(screen.queryByText('fileUpload.uploaded')).toBeNull();
  });

  it('uses the current canonical URL for copy and open/download', () => {
    const url = 'https://cdn.example.org/current.pdf';
    renderField({ fileUrl: url });

    fireEvent.click(screen.getByRole('button', { name: /fileUpload.copyUrl/i }));
    expect(mocks.copyToClipboard).toHaveBeenCalledWith(url);

    const link = screen.getByRole('link', { name: /fileUpload.openDownload/i });
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('download')).toBe(url);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('supports replacement through browse and drop', () => {
    const { dropzone, input, onFileSelect } = renderField({ fileUrl: 'https://cdn.example.org/old.pdf' });

    fireEvent.change(input, { target: { files: [validFile] } });

    const dropEvent = createEvent.drop(dropzone);
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [validFile] } });
    fireEvent(dropzone, dropEvent);

    expect(onFileSelect).toHaveBeenCalledTimes(2);
    expect(onFileSelect).toHaveBeenNthCalledWith(1, validFile);
    expect(onFileSelect).toHaveBeenNthCalledWith(2, validFile);
  });
});
