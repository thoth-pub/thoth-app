/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERRORS } from '@/src/shared/constants';

import AddAdditionalResource from '../AddAdditionalResource/AddAdditionalResource';
import EditAdditionalResource from '../EditAdditionalResource/EditAdditionalResource';

const mocks = vi.hoisted(() => ({
  activeEntity: {
    id: 'ar1',
    title: 'Test Resource',
    resourceType: 'DOCUMENT',
    url: '',
    doi: '',
    handle: '',
    description: '',
    attribution: '',
    fileUrl: 'https://cdn.example.org/old.pdf',
    orderNumber: 1,
  },
  createAdditionalResource: vi.fn().mockResolvedValue({}),
  createLoading: false,
  updateAdditionalResource: vi.fn().mockResolvedValue({}),
  uploadAdditionalResourceFile: vi.fn().mockResolvedValue('https://cdn.example.org/new.pdf'),
  update: vi.fn(),
  finishEditing: vi.fn(),
  sendErrorNotification: vi.fn(),
}));

const mockFiles = {
  first: new File([new Uint8Array(7000)], 'first.pdf', { type: 'application/pdf' }),
  replacement: new File([new Uint8Array(7000)], 'replacement.pdf', { type: 'application/pdf' }),
};

vi.mock('@/src/entities/additional-resource', () => ({
  useAdditionalResourceStateMachine: () => ({
    activeEntity: mocks.activeEntity,
    update: mocks.update,
    finishEditing: mocks.finishEditing,
  }),
  useCreateAdditionalResource: () => ({
    createAdditionalResource: mocks.createAdditionalResource,
    loading: mocks.createLoading,
    progress: 0,
  }),
  useUpdateAdditionalResource: () => ({ updateAdditionalResource: mocks.updateAdditionalResource }),
  useUploadAdditionalResourceFile: () => ({
    uploadAdditionalResourceFile: mocks.uploadAdditionalResourceFile,
    loading: false,
    progress: 0,
  }),
  EditAdditionalResourceForm: (props: {
    pendingFileName?: string;
    fileUrl?: string;
    uploadLoading?: boolean;
    uploadBusy?: boolean;
    onFileUpload?: (file: File) => void | Promise<void>;
    onResourceTypeUpdate?: (resourceType: string) => void;
    onDone?: () => void | Promise<void>;
  }) => (
    <div>
      <span data-testid="pending-file-name">{props.pendingFileName}</span>
      <span data-testid="file-url">{props.fileUrl}</span>
      <span data-testid="upload-loading">{String(props.uploadLoading)}</span>
      <span data-testid="upload-busy">{String(props.uploadBusy)}</span>
      <button type="button" onClick={() => props.onFileUpload?.(mockFiles.first)}>
        Select first
      </button>
      <button type="button" onClick={() => props.onFileUpload?.(mockFiles.replacement)}>
        Select replacement
      </button>
      <button type="button" onClick={() => props.onResourceTypeUpdate?.('VIDEO')}>
        Change type
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

describe('Additional Resource file flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeEntity.resourceType = 'DOCUMENT';
    mocks.createLoading = false;
    Object.defineProperty(mockFiles.first, 'size', { configurable: true, value: 7000 });
  });
  afterEach(cleanup);

  it('keeps only the final pending File and sends it during create', async () => {
    render(<AddAdditionalResource workId="w1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));
    expect(screen.getByTestId('pending-file-name')).toHaveTextContent('first.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Select replacement' }));
    expect(screen.getByTestId('pending-file-name')).toHaveTextContent('replacement.pdf');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));

    expect(mocks.createAdditionalResource).toHaveBeenCalledTimes(1);
    expect(mocks.createAdditionalResource.mock.calls[0][0].file).toBe(mockFiles.replacement);
  });

  it('locks file selection for a fileless create request without claiming an upload', () => {
    mocks.createLoading = true;
    render(<AddAdditionalResource workId="w1" />);

    expect(screen.getByTestId('upload-busy')).toHaveTextContent('true');
    expect(screen.getByTestId('upload-loading')).toHaveTextContent('false');
  });

  it('keeps the upload presentation when the create request includes a pending file', () => {
    mocks.createLoading = true;
    render(<AddAdditionalResource workId="w1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));

    expect(screen.getByTestId('upload-busy')).toHaveTextContent('true');
    expect(screen.getByTestId('upload-loading')).toHaveTextContent('true');
  });

  it('clears and reports a pending file invalidated by Resource Type change', () => {
    render(<AddAdditionalResource workId="w1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change type' }));

    expect(screen.getByTestId('pending-file-name')).toBeEmptyDOMElement();
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.FILE_FORMAT_INVALID);
  });

  it('revalidates the final pending file immediately before create', async () => {
    render(<AddAdditionalResource workId="w1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));
    Object.defineProperty(mockFiles.first, 'size', { configurable: true, value: 1 });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));

    expect(mocks.createAdditionalResource).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.MIN_FILE_SIZE_NOT_MET);
    expect(screen.getByTestId('pending-file-name')).toBeEmptyDOMElement();
  });

  it('reconciles the canonical URL after an edit replacement', async () => {
    render(<EditAdditionalResource workId="w1" />);
    expect(screen.getByTestId('file-url')).toHaveTextContent('https://cdn.example.org/old.pdf');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Select replacement' })));

    expect(mocks.uploadAdditionalResourceFile).toHaveBeenCalledWith('ar1', mockFiles.replacement);
    const updated = expect.objectContaining({ fileUrl: 'https://cdn.example.org/new.pdf' });
    expect(mocks.update).toHaveBeenCalledWith(updated);
    expect(mocks.updateAdditionalResource).toHaveBeenCalledWith(updated);
  });
});
