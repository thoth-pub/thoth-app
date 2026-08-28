/**
 * APP-ADM-01 (ADR-0010) acceptance 15-17: the superuser's publisher-workspace
 * treatment.
 *
 * Where an ordinary publisher user gets the active-publisher selector, a
 * superuser gets a persistent indicator naming the publisher they deliberately
 * entered, plus an explicit way back to Admin. The same component is the mount
 * point for refresh restoration, so a superuser reloading the workspace either
 * recovers their staff context or is returned to Admin - never silently placed
 * into a different publisher.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import navigationEn from '@/src/shared/i18n/locales/en/navigation.json';

const operatingContext = vi.hoisted(() => ({
  isStaffOperator: true,
  staffPublisher: { id: 'pub-2', name: 'Publisher B' } as { id: string; name: string } | null,
  enterPublisherContext: vi.fn(),
  restoreStaffContext: vi.fn().mockResolvedValue('restored'),
  returnToAdmin: vi.fn().mockResolvedValue(undefined),
  clearStaffContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./usePublisherOperatingContext', () => ({ default: () => operatingContext }));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => (navigationEn as Record<string, string>)[key] ?? key }),
}));

import PublisherOperatingContext from './PublisherOperatingContext';

beforeEach(() => {
  operatingContext.isStaffOperator = true;
  operatingContext.staffPublisher = { id: 'pub-2', name: 'Publisher B' };
  vi.clearAllMocks();
  operatingContext.restoreStaffContext.mockResolvedValue('restored');
  operatingContext.returnToAdmin.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe('PublisherOperatingContext', () => {
  it('shows a persistent indicator naming the deliberately entered publisher (acceptance 15)', () => {
    render(<PublisherOperatingContext />);

    expect(screen.getByText('Publisher B')).toBeInTheDocument();
    expect(screen.getByText(navigationEn.staffPublisherContext)).toBeInTheDocument();
  });

  it('offers an explicit Return to Admin action (acceptance 15)', () => {
    render(<PublisherOperatingContext />);

    expect(screen.getByRole('button', { name: 'Return to Admin' })).toBeInTheDocument();
  });

  it('clears the staff context and returns to Admin when the action is used (acceptance 17)', async () => {
    const user = userEvent.setup();

    render(<PublisherOperatingContext />);

    await user.click(screen.getByRole('button', { name: 'Return to Admin' }));

    expect(operatingContext.returnToAdmin).toHaveBeenCalledTimes(1);
  });

  it('restores the staff context on mount so it survives refresh (acceptance 16)', async () => {
    render(<PublisherOperatingContext />);

    await waitFor(() => {
      expect(operatingContext.restoreStaffContext).toHaveBeenCalledTimes(1);
    });
  });

  it('renders no staff treatment at all for a non-staff operator (acceptance 20)', () => {
    operatingContext.isStaffOperator = false;

    const { container } = render(<PublisherOperatingContext />);

    expect(container).toBeEmptyDOMElement();
    expect(operatingContext.restoreStaffContext).not.toHaveBeenCalled();
  });

  it('still offers the way back to Admin while no publisher is in context yet', () => {
    operatingContext.staffPublisher = null;

    render(<PublisherOperatingContext />);

    expect(screen.getByRole('button', { name: 'Return to Admin' })).toBeInTheDocument();
  });
});
