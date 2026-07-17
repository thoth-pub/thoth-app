/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    work: {
      doi: '10.1234/test',
      landingPage: 'https://example.com',
      coverUrl: 'https://example.com/cover.jpg',
    },
    updateWork: vi.fn().mockResolvedValue({}),
    updateWorkFrontCover: vi.fn().mockResolvedValue({}),
    loading: false,
    isWorkLoading: false,
    sendErrorNotification: vi.fn(),
    sendSuccessNotification: vi.fn(),
    isDragStarted: false,
    copyToClipboard: vi.fn(),
    reset: vi.fn(),
    setValue: vi.fn(),
    handleSubmit: vi.fn(() => vi.fn()),
    register: vi.fn(() => ({ ref: vi.fn() })),
    watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
    ref: { current: null },
  };
});

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({
    work: mocks.work,
    loading: mocks.isWorkLoading,
    updateWork: mocks.updateWork,
  }),
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
  default: null,
}));

vi.mock('@/src/shared/hooks/useIsDragStarted', () => ({
  default: () => mocks.isDragStarted,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: mocks.register,
    handleSubmit: mocks.handleSubmit,
    setValue: mocks.setValue,
    reset: mocks.reset,
    watch: mocks.watch,
    formState: { errors: {} },
  }),
}));

vi.mock('react-use', () => ({
  useCopyToClipboard: () => [null, mocks.copyToClipboard],
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}));

import { useDragAndDropForm } from './useDragAndDropForm';

describe('useDragAndDropForm', () => {
  beforeEach(() => {
    mocks.work.doi = '10.1234/test';
    mocks.work.coverUrl = 'https://example.com/cover.jpg';
    mocks.updateWorkFrontCover.mockClear();
    mocks.updateWork.mockClear();
    mocks.sendErrorNotification.mockClear();
    mocks.sendSuccessNotification.mockClear();
    mocks.reset.mockClear();
    mocks.setValue.mockClear();
  });

  it('should return isDragStarted state', () => {
    const { result } = renderHook(() => useDragAndDropForm('work-1'));

    expect(result.current.isDragStarted).toBe(false);
  });

  it('should indicate cover is filled when coverUrl exists', () => {
    const { result } = renderHook(() => useDragAndDropForm('work-1'));

    expect(result.current.isUrlCoverFilled).toBe(true);
  });

  it('should indicate cover is not filled when coverUrl is empty', () => {
    mocks.work.coverUrl = '';

    const { result } = renderHook(() => useDragAndDropForm('work-1'));

    expect(result.current.isUrlCoverFilled).toBeFalsy();
  });

  describe('uploadFile', () => {
    it('should send error when doi is empty', () => {
      mocks.work.doi = '';

      const { result } = renderHook(() => useDragAndDropForm('work-1'));

      act(() => {
        result.current.uploadFile();
      });

      expect(mocks.sendErrorNotification).toHaveBeenCalled();
    });
  });

  describe('dropFile', () => {
    it('should send error when doi is empty', () => {
      mocks.work.doi = '';

      const { result } = renderHook(() => useDragAndDropForm('work-1'));
      const event = { preventDefault: vi.fn(), dataTransfer: { files: [] } } as unknown as React.DragEvent<HTMLFormElement>;

      act(() => {
        result.current.dropFile(event);
      });

      expect(mocks.sendErrorNotification).toHaveBeenCalled();
    });

    it('should set value and reset when doi exists', () => {
      const { result } = renderHook(() => useDragAndDropForm('work-1'));
      const file = new File([''], 'cover.jpg');
      const event = {
        preventDefault: vi.fn(),
        dataTransfer: { files: [file] },
      } as unknown as React.DragEvent<HTMLFormElement>;

      act(() => {
        result.current.dropFile(event);
      });

      expect(mocks.reset).toHaveBeenCalled();
      expect(mocks.setValue).toHaveBeenCalled();
    });
  });

  describe('confirmRemoveCover', () => {
    it('should update work with empty coverUrl and notify success', async () => {
      const { result } = renderHook(() => useDragAndDropForm('work-1'));

      await act(async () => {
        await result.current.confirmRemoveCover();
      });

      expect(mocks.updateWork).toHaveBeenCalledWith(
        expect.objectContaining({ coverUrl: '' }),
      );
      expect(mocks.sendSuccessNotification).toHaveBeenCalled();
    });
  });

  describe('copyCoverUrlToClipboard', () => {
    it('should copy cover url to clipboard', () => {
      const { result } = renderHook(() => useDragAndDropForm('work-1'));
      const event = { stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLButtonElement>;

      act(() => {
        result.current.copyCoverUrlToClipboard(event);
      });

      expect(mocks.sendSuccessNotification).toHaveBeenCalled();
    });
  });

  describe('openRemoveDialog / closeRemoveDialog', () => {
    it('should toggle dialog state', () => {
      const { result } = renderHook(() => useDragAndDropForm('work-1'));
      const event = { stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLButtonElement>;

      act(() => {
        result.current.openRemoveDialog(event);
      });

      expect(result.current.isRemoveDialogOpen).toBe(true);

      act(() => {
        result.current.closeRemoveDialog();
      });

      expect(result.current.isRemoveDialogOpen).toBe(false);
    });
  });

  describe('uploadFileClick', () => {
    it('should prevent default when doi is empty', () => {
      mocks.work.doi = '';

      const { result } = renderHook(() => useDragAndDropForm('work-1'));
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLInputElement>;

      act(() => {
        result.current.uploadFileClick(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mocks.sendErrorNotification).toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('should notify the user when the selected cover fails validation', async () => {
      let capturedOnInvalid: ((errors: Record<string, { message?: string }>) => void) | undefined;
      mocks.handleSubmit.mockImplementation(((_onValid: unknown, onInvalid: never) => {
        capturedOnInvalid = onInvalid;
        return vi.fn();
      }) as never);
      let watchCallback: (() => void) | undefined;
      mocks.watch.mockImplementation(((callback: () => void) => {
        watchCallback = callback;
        return { unsubscribe: vi.fn() };
      }) as never);

      renderHook(() => useDragAndDropForm('work-1'));

      await act(async () => {
        watchCallback?.();
      });

      expect(capturedOnInvalid).toBeDefined();
      act(() => {
        capturedOnInvalid?.({ coverUrl: { message: 'coverImageMustBeJpeg' } });
      });

      expect(mocks.sendErrorNotification).toHaveBeenCalledWith('coverImageMustBeJpeg');
      expect(mocks.reset).toHaveBeenCalled();
    });
  });
});
