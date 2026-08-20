/**
 * Route coverage for the REAL production server component
 * `app/admin/publishers/page.tsx` (APP-02A). It mocks only the auth
 * infrastructure and observes the element the real page returns: the signed-in
 * gate mirrors every other /admin page, and the page hands off to the
 * PublisherAdministration widget, which owns the authoritative-superuser query
 * gating client-side (the backend remains the authorization boundary).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Auth gate: authOptions is only forwarded to the mocked getServerSession, so a
// bare object spares us the real next-auth module graph.
vi.mock('@/src/shared/lib/auth/auth', () => ({ authOptions: {} }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => getServerSession(...args) }));

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => redirect(...args) }));

// Observation boundary: the widget the real page must render.
const { PublisherAdministration } = vi.hoisted(() => ({ PublisherAdministration: vi.fn(() => null) }));
vi.mock('@/src/widgets', () => ({ PublisherAdministration }));

import PublishersPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublishersPage (/admin/publishers)', () => {
  it('redirects to login when there is no session, like the other /admin pages', async () => {
    getServerSession.mockResolvedValue(null);

    await PublishersPage();

    expect(redirect).toHaveBeenCalledWith('/auth/login');
  });

  it('renders the PublisherAdministration widget for a signed-in session without redirecting', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'staff@example.com' } });

    const element = await PublishersPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(element.type).toBe(PublisherAdministration);
  });
});
