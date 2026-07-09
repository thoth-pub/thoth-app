import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelector = vi.fn();
const mockUseActorRef = vi.fn();
const mockSend = vi.fn();

vi.mock('../forms.provider', () => ({
  FormStateMachineContext: {
    useSelector: (selector: (state: unknown) => unknown) => mockSelector(selector),
    useActorRef: () => mockUseActorRef(),
  },
}));

vi.mock('react-use', () => ({
  useUnmount: (fn: () => void) => fn(),
}));

import useFormStateMachine from './useFormStateMachine';

describe('useFormStateMachine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActorRef.mockReturnValue({ send: mockSend });
  });

  it('should return activeFormId from selector', () => {
    mockSelector.mockReturnValue('form-1');
    const { result } = renderHook(() => useFormStateMachine());

    expect(result.current.activeFormId).toBe('form-1');
    expect(mockSelector).toHaveBeenCalled();
  });

  it('should send setActiveFormId event on edit', () => {
    mockSelector.mockReturnValue(null);
    const { result } = renderHook(() => useFormStateMachine());

    result.current.edit('form-2');

    expect(mockSend).toHaveBeenCalledWith({ type: 'setActiveFormId', id: 'form-2' });
  });

  it('should send close event on closeForm', () => {
    mockSelector.mockReturnValue(null);
    const { result } = renderHook(() => useFormStateMachine());

    result.current.closeForm();

    expect(mockSend).toHaveBeenCalledWith({ type: 'close' });
  });

  it('should send close on unmount via useUnmount', () => {
    mockSelector.mockReturnValue(null);
    const { unmount } = renderHook(() => useFormStateMachine());

    unmount();

    expect(mockSend).toHaveBeenCalledWith({ type: 'close' });
  });
});
