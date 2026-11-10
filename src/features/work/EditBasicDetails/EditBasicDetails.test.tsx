/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EditBasicDetails from './EditBasicDetails';

type Option = { value: string; label: string };

const imprintOne = { value: 'imprint-1', label: 'Imprint One' };

const mocks = vi.hoisted(() => ({ identity: {} as Record<string, unknown> }));

/** `useUser` as a form sees it: the raw fields, and the settled identity latched from authoritative `me`. */
const identity = ({ settled, raw = settled }: { settled: Option[] | null; raw?: Option[] | null }) => ({
  userImprintsOptions: raw ?? [],
  isAuthoritative: raw !== null,
  identitySettled: settled !== null,
  settledImprintsOptions: settled ?? [],
});

vi.mock('@/src/entities/user', () => ({ useUser: () => mocks.identity }));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: () => ({ isImprintEditable: true }),
}));

vi.mock('@/src/entities/work', () => ({
  useWorkRecommendations: () => ({}),
  EditDoi: () => null,
  EditLccn: () => null,
  EditLicense: () => null,
  EditOclc: () => null,
  EditWorkTitle: () => null,
  EditWorkType: () => null,
  EditImprint: ({ disabled, imprintOptions }: { disabled: boolean; imprintOptions: Option[] }) => (
    <div>
      <span data-testid="imprint-disabled">{String(disabled)}</span>
      <span data-testid="imprint-options">{imprintOptions.map(({ label }) => label).join(',')}</span>
    </div>
  ),
}));

vi.mock('@/src/shared/ui', () => ({
  RecommendedSection: ({ children }: { children: (props: { showRecommendations: boolean }) => React.ReactNode }) => (
    <div>{children({ showRecommendations: false })}</div>
  ),
  TranslatedContent: () => null,
}));

vi.mock('../EditWorkCover/EditWorkCover', () => ({ default: () => null }));

describe('EditBasicDetails identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers no imprint to pick while identity is loading or expired', () => {
    mocks.identity = identity({ settled: null });
    render(<EditBasicDetails workId="work-1" />);

    expect(screen.getByTestId('imprint-disabled')).toHaveTextContent('true');
    expect(screen.getByTestId('imprint-options')).toBeEmptyDOMElement();
  });

  it('offers the user imprints with authoritative identity', () => {
    mocks.identity = identity({ settled: [imprintOne] });
    render(<EditBasicDetails workId="work-1" />);

    expect(screen.getByTestId('imprint-disabled')).toHaveTextContent('false');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One');
  });

  it('keeps the imprint options through a background refetch or token rotation', () => {
    mocks.identity = identity({ settled: [imprintOne] });
    const { rerender } = render(<EditBasicDetails workId="work-1" />);

    mocks.identity = identity({ settled: [imprintOne], raw: null });
    rerender(<EditBasicDetails workId="work-1" />);

    expect(screen.getByTestId('imprint-disabled')).toHaveTextContent('false');
    expect(screen.getByTestId('imprint-options')).toHaveTextContent('Imprint One');
  });
});
