/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix, @next/next/no-img-element */
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DragAndDropForm from './DragAndDropForm';

// Integration-style test: the REAL useDragAndDropForm hook and the REAL
// cover validation schema run here. Only the data/UI boundaries are mocked, so
// a regression of the watch/reset recursion, an unhandled upload rejection, or
// a non-JPEG passing validation would actually be caught.

const mocks = vi.hoisted(() => ({
  work: { doi: '10.1234/test', coverUrl: 'https://cdn.example.org/10.1234/test_frontcover.jpg' } as {
    doi: string;
    coverUrl: string;
  },
  updateWorkFrontCover: vi.fn(),
  updateWork: vi.fn().mockResolvedValue({}),
  loading: false,
  isWorkLoading: false,
  sendErrorNotification: vi.fn(),
  sendSuccessNotification: vi.fn(),
  copyToClipboard: vi.fn(),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work, loading: mocks.isWorkLoading, updateWork: mocks.updateWork }),
  useUpdateWorkFrontCover: () => ({
    updateWorkFrontCover: mocks.updateWorkFrontCover,
    loading: mocks.loading,
  }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({
    sendErrorNotification: mocks.sendErrorNotification,
    sendSuccessNotification: mocks.sendSuccessNotification,
  }),
}));

vi.mock('react-use', () => ({
  useCopyToClipboard: () => [null, mocks.copyToClipboard],
}));

vi.mock('./PlaceholderLogo', () => ({ PlaceholderLogo: () => <div data-testid="placeholder-logo" /> }));
vi.mock('./Wrapper', () => ({ Wrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock('@mui/icons-material/ContentCopy', () => ({ default: () => <span>copy-icon</span> }));
vi.mock('@mui/icons-material/DeleteOutline', () => ({ default: () => <span>delete-icon</span> }));

vi.mock('@/src/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  CircularProgress: () => <div data-testid="spinner" />,
  IconButton: ({ children, onClick }: { children: React.ReactNode; onClick?: (e: unknown) => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  ConfirmDialog: ({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button type="button" onClick={onConfirm}>
          confirm-remove
        </button>
        <button type="button" onClick={onCancel}>
          cancel-remove
        </button>
      </div>
    ) : null,
  TranslatedContent: ({ content }: { content: string }) => <span>{content}</span>,
  Typography: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const JPEG_MIME = 'image/jpeg';
const VALID_SIZE = 7000; // between appConfig.minFileSize (6250) and maxFileSize

const makeFile = (name: string, type: string, size = VALID_SIZE, jpegMagicBytes = true) => {
  const buffer = new Uint8Array(size);
  if (jpegMagicBytes) {
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    buffer[2] = 0xff;
  }
  const file = new File([buffer], name, { type });
  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    });
  }
  return file;
};

const getDropZone = (container: HTMLElement) => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  return { input, dropZone: input.parentElement as HTMLElement };
};

const dropFileOn = (dropZone: HTMLElement, file: File | undefined) => {
  const event = createEvent.drop(dropZone);
  Object.defineProperty(event, 'dataTransfer', { value: { files: file ? [file] : [] } });
  const preventSpy = vi.spyOn(event, 'preventDefault');
  fireEvent(dropZone, event);
  return preventSpy;
};

describe('DragAndDropForm (integration)', () => {
  beforeEach(() => {
    mocks.work.doi = '10.1234/test';
    mocks.work.coverUrl = 'https://cdn.example.org/10.1234/test_frontcover.jpg';
    mocks.loading = false;
    mocks.isWorkLoading = false;
    mocks.updateWorkFrontCover.mockReset().mockResolvedValue('https://cdn.example.org/new_frontcover.jpg');
    mocks.updateWork.mockClear();
    mocks.sendErrorNotification.mockClear();
    mocks.sendSuccessNotification.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('picker configuration', () => {
    it('advertises JPEG only via the accept attribute', () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);
      expect(input.getAttribute('accept')).toBe('image/jpeg,.jpg,.jpeg');
    });
  });

  describe('drag and drop', () => {
    it('dropping a valid .jpg uploads exactly once', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));

      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
      expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
    });

    it('dropping a valid .jpeg uploads exactly once', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.jpeg', JPEG_MIME));

      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
    });

    it('dropping a PNG shows the JPEG-only error once and does not upload', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.png', 'image/png'));

      await waitFor(() => expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1));
      expect(mocks.sendErrorNotification).toHaveBeenCalledWith('coverImageMustBeJpeg');
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });

    it('dropping a WebP shows the JPEG-only error once and does not upload', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.webp', 'image/webp'));

      await waitFor(() => expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1));
      expect(mocks.sendErrorNotification).toHaveBeenCalledWith('coverImageMustBeJpeg');
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });

    it('does not recursively submit or notify on a single drop', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));
      // Allow any (erroneous) follow-up cycles to run.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1);
    });

    it('prevents the browser default navigation on drop', () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      const preventSpy = dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));
      expect(preventSpy).toHaveBeenCalled();
    });

    it('prevents the default on dragover so drop fires', () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      const event = createEvent.dragOver(dropZone);
      const preventSpy = vi.spyOn(event, 'preventDefault');
      fireEvent(dropZone, event);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('remains usable after an invalid drop (a subsequent valid drop uploads)', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.png', 'image/png'));
      await waitFor(() => expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1));
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();

      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
    });

    it('does not flicker drag state across nested enter/leave, and dragover makes no change', () => {
      mocks.work.coverUrl = 'https://cdn.example.org/10.1234/test_frontcover.jpg';
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      // Not dragging: the browse button is present.
      expect(screen.queryByText('actions.browseFile')).not.toBeNull();

      fireEvent.dragEnter(dropZone); // enter drop zone
      expect(screen.queryByText('actions.browseFile')).toBeNull(); // dragging

      fireEvent.dragEnter(dropZone); // enter nested child
      // Repeated dragover must not change state.
      fireEvent.dragOver(dropZone);
      fireEvent.dragOver(dropZone);
      expect(screen.queryByText('actions.browseFile')).toBeNull(); // still dragging

      fireEvent.dragLeave(dropZone); // leave nested child — still inside
      expect(screen.queryByText('actions.browseFile')).toBeNull(); // no flicker

      fireEvent.dragLeave(dropZone); // leave drop zone
      expect(screen.queryByText('actions.browseFile')).not.toBeNull(); // deactivated
    });

    it('keeps drag depth non-negative when a leave arrives before any enter', () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      // Stray leaves (depth would go negative without the Math.max(0, ...) guard).
      fireEvent.dragLeave(dropZone);
      fireEvent.dragLeave(dropZone);
      expect(screen.queryByText('actions.browseFile')).not.toBeNull(); // not active

      // A single enter must still activate — proof the depth was clamped at 0,
      // not left at a negative value that one enter could not lift to 1.
      fireEvent.dragEnter(dropZone);
      expect(screen.queryByText('actions.browseFile')).toBeNull(); // active

      // And a single matching leave returns to inactive.
      fireEvent.dragLeave(dropZone);
      expect(screen.queryByText('actions.browseFile')).not.toBeNull(); // inactive
    });

    it('resets drag state deterministically on drop', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      fireEvent.dragEnter(dropZone);
      expect(screen.queryByText('actions.browseFile')).toBeNull(); // dragging

      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));
      // Drop clears drag state synchronously, regardless of the async upload.
      expect(screen.queryByText('actions.browseFile')).not.toBeNull();
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
    });
  });

  describe('file browsing', () => {
    it('selecting a valid JPG uploads exactly once', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });

      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
    });

    it('selecting a valid .jpeg uploads exactly once', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.jpeg', JPEG_MIME)] } });

      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
    });

    it('selecting a PNG performs no upload', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.png', 'image/png')] } });

      await waitFor(() => expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1));
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });

    it('selecting a WebP performs no upload', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.webp', 'image/webp')] } });

      await waitFor(() => expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1));
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });

    it('rejects a file whose contents are not JPEG data', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME, VALID_SIZE, false)] } });

      await waitFor(() => expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1));
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });

    it('clears the input after a successful upload so the same file can be reselected', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(input.value).toBe(''));

      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(2));
    });
  });

  describe('error handling', () => {
    it('catches a rejected upload, notifies once, clears the input, and allows retry', async () => {
      // Simulate the real useUpdateWorkFrontCover: its mutation onError shows the
      // notification, then the promise rejects.
      mocks.updateWorkFrontCover.mockImplementation(async () => {
        mocks.sendErrorNotification('Internal error: Failed to head object: dispatch failure');
        throw new Error('Internal error: Failed to head object: dispatch failure');
      });

      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });

      // finally ran (input cleared) — proves the rejection was consumed.
      await waitFor(() => expect(input.value).toBe(''));
      expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1);
      // The API error was displayed exactly once (by the mutation), not twice.
      expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1);

      // Retry after failure works.
      mocks.updateWorkFrontCover.mockResolvedValueOnce('https://cdn.example.org/new_frontcover.jpg');
      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(2));
    });
  });

  describe('rendering stability', () => {
    it('keeps the cover image URL stable across drag-state changes', async () => {
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      const initialSrc = (screen.getByAltText('Cover') as HTMLImageElement).src;

      // Toggle drag state (enter hides the image, leave shows it again).
      fireEvent.dragEnter(dropZone);
      fireEvent.dragLeave(dropZone);

      const afterSrc = (screen.getByAltText('Cover') as HTMLImageElement).src;
      expect(afterSrc).toBe(initialSrc);
      // The cache-buster is a query param; the base URL is the canonical cover.
      expect(initialSrc).toContain('10.1234/test_frontcover.jpg');
    });

    it('bumps the cache-buster only after a successful upload (not on drag or failure)', async () => {
      // Deterministic cache-buster values via a controlled clock.
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000);

      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input, dropZone } = getDropZone(container);

      const initialSrc = (screen.getByAltText('Cover') as HTMLImageElement).src;
      expect(initialSrc).toContain('?1000');

      // A drag toggle must not change the cache-buster.
      nowSpy.mockReturnValue(2000);
      fireEvent.dragEnter(dropZone);
      fireEvent.dragLeave(dropZone);
      expect((screen.getByAltText('Cover') as HTMLImageElement).src).toBe(initialSrc);

      // A failed upload must not change the cache-buster.
      mocks.updateWorkFrontCover.mockRejectedValueOnce(new Error('boom'));
      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(input.value).toBe(''));
      expect((screen.getByAltText('Cover') as HTMLImageElement).src).toBe(initialSrc);

      // A successful upload bumps it to the new clock value.
      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });
      await waitFor(() => expect(mocks.updateWorkFrontCover).toHaveBeenCalledTimes(2));
      await waitFor(() => expect((screen.getByAltText('Cover') as HTMLImageElement).src).toContain('?2000'));

      nowSpy.mockRestore();
    });

    it('still supports cover removal', async () => {
      render(<DragAndDropForm workId="work-1" />);
      // Open the remove dialog via the delete icon button.
      fireEvent.click(screen.getByText('delete-icon'));
      // Confirm removal.
      fireEvent.click(screen.getByText('confirm-remove'));

      await waitFor(() => expect(mocks.updateWork).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: '' })));
      expect(mocks.sendSuccessNotification).toHaveBeenCalledWith('coverRemoveSuccess');
    });

    it('copies the canonical cover URL without the cache-buster', () => {
      render(<DragAndDropForm workId="work-1" />);

      fireEvent.click(screen.getByText('copy-icon'));

      expect(mocks.copyToClipboard).toHaveBeenCalledWith('https://cdn.example.org/10.1234/test_frontcover.jpg');
      expect(mocks.sendSuccessNotification).toHaveBeenCalledWith('coverUrlCopySuccess');
    });
  });

  describe('doi guard', () => {
    it('blocks browse and warns once when the work has no DOI', () => {
      mocks.work.doi = '';
      render(<DragAndDropForm workId="work-1" />);

      fireEvent.click(screen.getByText('actions.browseFile'));

      expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1);
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });

    it('blocks a drop and warns once when the work has no DOI', () => {
      mocks.work.doi = '';
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));

      expect(mocks.sendErrorNotification).toHaveBeenCalledTimes(1);
      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
    });
  });

  describe('loading guard', () => {
    it('disables browse and does not start another upload', () => {
      mocks.loading = true;
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { input } = getDropZone(container);

      expect(input).toBeDisabled();
      fireEvent.change(input, { target: { files: [makeFile('cover.jpg', JPEG_MIME)] } });

      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
      expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
    });

    it('does not start another upload when a valid JPEG is dropped', () => {
      mocks.loading = true;
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      fireEvent.dragEnter(dropZone);
      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));

      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
      expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
      expect(screen.queryByText('actions.browseFile')).not.toBeNull();
    });

    it('does not show a DOI warning when loading and DOI-less', () => {
      mocks.work.doi = '';
      mocks.isWorkLoading = true;
      const { container } = render(<DragAndDropForm workId="work-1" />);
      const { dropZone } = getDropZone(container);

      dropFileOn(dropZone, makeFile('cover.jpg', JPEG_MIME));

      expect(mocks.updateWorkFrontCover).not.toHaveBeenCalled();
      expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
    });
  });
});
