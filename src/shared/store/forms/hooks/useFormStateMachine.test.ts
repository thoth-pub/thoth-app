import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IDs } from '@/src/shared/constants';

const mockSelector = vi.fn();
const mockUseActorRef = vi.fn();
const mockSend = vi.fn();
const mockSnapshot: {
  value: string;
  context: { activeForm: string | null; attentionRequest: number };
} = {
  value: 'init',
  context: { activeForm: null, attentionRequest: 0 },
};

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
    mockSnapshot.value = 'init';
    mockSnapshot.context.activeForm = null;
    mockSnapshot.context.attentionRequest = 0;
    mockSelector.mockImplementation((selector) => selector(mockSnapshot));
    mockUseActorRef.mockReturnValue({ send: mockSend, getSnapshot: () => mockSnapshot });
  });

  it('should return activeFormId from selector', () => {
    mockSnapshot.context.activeForm = 'form-1';
    const { result } = renderHook(() => useFormStateMachine());

    expect(result.current.activeFormId).toBe('form-1');
    expect(mockSelector).toHaveBeenCalled();
  });

  it('should send setActiveFormId event on edit', () => {
    const { result } = renderHook(() => useFormStateMachine());

    expect(result.current.edit(IDs.WORK_TYPE)).toBe(true);

    expect(mockSend).toHaveBeenCalledWith({ type: 'setActiveFormId', id: IDs.WORK_TYPE });
  });

  it('should report a blocked edit and keep the request in the state machine', () => {
    mockSnapshot.value = 'editing';
    mockSnapshot.context.activeForm = 'form-1';
    const { result } = renderHook(() => useFormStateMachine());

    expect(result.current.edit(IDs.WORK_TYPE)).toBe(false);

    expect(mockSend).toHaveBeenCalledWith({ type: 'setActiveFormId', id: IDs.WORK_TYPE });
  });

  it('should send close event on closeForm', () => {
    const { result } = renderHook(() => useFormStateMachine());

    result.current.closeForm();

    expect(mockSend).toHaveBeenCalledWith({ type: 'close' });
  });

  it('should send close on unmount via useUnmount', () => {
    const { unmount } = renderHook(() => useFormStateMachine());

    unmount();

    expect(mockSend).toHaveBeenCalledWith({ type: 'close' });
  });
});
