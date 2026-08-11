/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERRORS } from '@/src/shared/constants';

import AddFeaturedVideo from '../AddFeaturedVideo/AddFeaturedVideo';
import EditFeaturedVideo from '../EditFeaturedVideo/EditFeaturedVideo';

const mocks = vi.hoisted(() => ({
  activeEntity: {
    id: 'fv1',
    title: 'Test Video',
    url: 'https://cdn.example.org/old.mp4',
    width: 1920,
    height: 1080,
    fileUrl: 'https://cdn.example.org/old.mp4',
    orderNumber: 1,
  },
  createFeaturedVideo: vi.fn().mockResolvedValue({}),
  updateFeaturedVideo: vi.fn().mockResolvedValue({}),
  uploadFeaturedVideoFile: vi.fn().mockResolvedValue('https://cdn.example.org/new.mp4'),
  update: vi.fn(),
  finishEditing: vi.fn(),
  sendErrorNotification: vi.fn(),
}));

const mockFiles = {
  first: new File([new Uint8Array(7000)], 'first.mp4', { type: 'video/mp4' }),
  replacement: new File([new Uint8Array(7000)], 'replacement.webm', { type: 'video/webm' }),
};

vi.mock('@/src/entities/featured-video', () => ({
  useFeaturedVideoStateMachine: () => ({
    activeEntity: mocks.activeEntity,
    update: mocks.update,
    finishEditing: mocks.finishEditing,
  }),
  useCreateFeaturedVideo: () => ({ createFeaturedVideo: mocks.createFeaturedVideo, loading: false, progress: 0 }),
  useUpdateFeaturedVideo: () => ({ updateFeaturedVideo: mocks.updateFeaturedVideo }),
  useUploadFeaturedVideoFile: () => ({
    uploadFeaturedVideoFile: mocks.uploadFeaturedVideoFile,
    loading: false,
    progress: 0,
  }),
  EditFeaturedVideoForm: (props: {
    pendingFileName?: string;
    fileUrl?: string;
    onFileUpload?: (file: File) => void | Promise<void>;
    onDone?: () => void | Promise<void>;
  }) => (
    <div>
      <span data-testid="pending-file-name">{props.pendingFileName}</span>
      <span data-testid="file-url">{props.fileUrl}</span>
      <button type="button" onClick={() => props.onFileUpload?.(mockFiles.first)}>
        Select first
      </button>
      <button type="button" onClick={() => props.onFileUpload?.(mockFiles.replacement)}>
        Select replacement
      </button>
      <button type="button" onClick={() => props.onDone?.()}>
        Save
      </button>
    </div>
  ),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({ sendErrorNotification: mocks.sendErrorNotification }),
}));

vi.mock('@/src/shared/ui', () => ({
  TableNewEntityFormWrapper: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Featured Video file flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(mockFiles.first, 'size', { configurable: true, value: 7000 });
  });
  afterEach(cleanup);

  it('keeps only the final pending File and sends it during create', async () => {
    render(<AddFeaturedVideo workId="w1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));
    expect(screen.getByTestId('pending-file-name')).toHaveTextContent('first.mp4');
    fireEvent.click(screen.getByRole('button', { name: 'Select replacement' }));
    expect(screen.getByTestId('pending-file-name')).toHaveTextContent('replacement.webm');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));

    expect(mocks.createFeaturedVideo).toHaveBeenCalledTimes(1);
    expect(mocks.createFeaturedVideo.mock.calls[0][0].file).toBe(mockFiles.replacement);
  });

  it('revalidates the final pending file before create', async () => {
    render(<AddFeaturedVideo workId="w1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));
    Object.defineProperty(mockFiles.first, 'size', { configurable: true, value: 1 });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));

    expect(mocks.createFeaturedVideo).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MIN_FILE_SIZE_NOT_MET);
    expect(screen.getByTestId('pending-file-name')).toBeEmptyDOMElement();
  });

  it('reconciles both fileUrl and editable url after edit replacement', async () => {
    render(<EditFeaturedVideo workId="w1" />);
    expect(screen.getByTestId('file-url')).toHaveTextContent('https://cdn.example.org/old.mp4');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Select replacement' })));

    expect(mocks.uploadFeaturedVideoFile).toHaveBeenCalledWith('fv1', mockFiles.replacement);
    const updated = expect.objectContaining({
      fileUrl: 'https://cdn.example.org/new.mp4',
      url: 'https://cdn.example.org/new.mp4',
    });
    expect(mocks.update).toHaveBeenCalledWith(updated);
    expect(mocks.updateFeaturedVideo).toHaveBeenCalledWith(updated);
  });
});
