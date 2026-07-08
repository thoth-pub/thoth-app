import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UIContext, UIProvider, useUIContext } from './ui.context';

vi.mock('../../hooks/useIsDesktop', () => ({
  default: () => true,
}));

describe('UIProvider', () => {
  it('should provide default isExpanded based on isDesktop', () => {
    let contextValue: any;

    const Consumer = () => {
      contextValue = useUIContext();
      return null;
    };

    render(
      <UIProvider>
        <Consumer />
      </UIProvider>,
    );

    expect(contextValue.isExpanded).toBe(true);
  });

  it('should provide updateIsExpanded function', () => {
    let contextValue: any;

    const Consumer = () => {
      contextValue = useUIContext();
      return null;
    };

    render(
      <UIProvider>
        <Consumer />
      </UIProvider>,
    );

    expect(typeof contextValue.updateIsExpanded).toBe('function');
  });

  it('should have UIContext with default values', () => {
    let contextValue: any;

    const Consumer = () => {
      contextValue = useUIContext();
      return null;
    };

    render(
      <UIContext.Provider value={{ isExpanded: false, updateIsExpanded: () => 'test' }}>
        <Consumer />
      </UIContext.Provider>,
    );

    expect(contextValue.isExpanded).toBe(false);
    expect(contextValue.updateIsExpanded()).toBe('test');
  });
});
