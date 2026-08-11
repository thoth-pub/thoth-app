/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { cleanup, createEvent, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicationType } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { ERRORS, NOTIFICATIONS } from '@/src/shared/constants';

import EditFile from './EditFile';

const mocks = vi.hoisted(() => ({ sendErrorNotification: vi.fn() }));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({ sendErrorNotification: mocks.sendErrorNotification }),
  useTypedTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-use', () => ({ useCopyToClipboard: () => [null, vi.fn()] }));

const makeFile = (name: string, type: string, size = 7000) => new File([new Uint8Array(size)], name, { type });

const renderEditFile = (overrides: Partial<React.ComponentProps<typeof EditFile>> = {}) => {
  const onSubmit = vi.fn();
  const result = render(
    <EditFile
      disabled={false}
      loading={false}
      onSubmit={onSubmit}
      publicationType={PublicationType.Pdf}
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

const dropFile = (dropzone: HTMLElement, file: File) => {
  const event = createEvent.drop(dropzone);
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
  fireEvent(dropzone, event);
};

describe('EditFile', () => {
  beforeEach(() => mocks.sendErrorNotification.mockClear());
  afterEach(cleanup);

  it('accepts a valid current-publication file from browse', () => {
    const { input, onSubmit } = renderEditFile();
    const file = makeFile('book.pdf', 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onSubmit).toHaveBeenCalledWith(file);
    expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
  });

  it('rejects invalid types from browse and drop', () => {
    const { dropzone, input, onSubmit } = renderEditFile();
    const file = makeFile('book.png', 'image/png');

    fireEvent.change(input, { target: { files: [file] } });
    dropFile(dropzone, file);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenNthCalledWith(1, ERRORS.FILE_FORMAT_INVALID);
    expect(mocks.sendErrorNotification).toHaveBeenNthCalledWith(2, ERRORS.FILE_FORMAT_INVALID);
  });

  it('rejects files outside the existing size bounds', () => {
    const { input, onSubmit } = renderEditFile();

    fireEvent.change(input, { target: { files: [makeFile('tiny.pdf', 'application/pdf', 10)] } });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MIN_FILE_SIZE_NOT_MET);

    const oversized = makeFile('oversized.pdf', 'application/pdf');
    Object.defineProperty(oversized, 'size', { value: appConfig.maxPublicationFileSize + 1 });
    fireEvent.change(input, { target: { files: [oversized] } });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MAX_FILE_SIZE_EXCEEDED);
  });

  it('enforces prerequisites equally for browse and drop', () => {
    const { dropzone, input, onSubmit } = renderEditFile({ disabled: true });
    const file = makeFile('book.pdf', 'application/pdf');

    fireEvent.change(input, { target: { files: [file] } });
    dropFile(dropzone, file);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(NOTIFICATIONS.PUBLICATION_UPLOAD_FILE_DISABLED);
  });
});
