/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SetEntity } from '../../model/set.types';
import { EditSetTitle } from './EditSetTitle';

const mocks = vi.hoisted(() => ({
  isDisabled: undefined as boolean | undefined,
  // The imprint's default locale; undefined while identity has not settled.
  defaultLocaleOption: { value: 'EN', label: 'English' } as { value: string; label: string } | undefined,
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultLocaleOption: () => mocks.defaultLocaleOption,
}));

vi.mock('@/src/shared/ui/layout/EditableContent/EditableContent', () => ({
  EditableContent: ({ isDisabled }: { isDisabled?: boolean }) => {
    mocks.isDisabled = isDisabled;

    return null;
  },
}));

const set = {
  id: 'set-1',
  titles: [{ id: 'title-1', title: 'A Set', subtitle: '', localeCode: 'EN', canonical: true, fullTitle: 'A Set' }],
  imprintId: 'imprint-1',
} as unknown as SetEntity;

describe('EditSetTitle identity gate (APP-AUTH-IDENTITY-FORMS-01)', () => {
  beforeEach(() => {
    mocks.isDisabled = undefined;
    mocks.defaultLocaleOption = { value: 'EN', label: 'English' };
  });

  it('cannot be opened while identity is loading or expired, so no default locale is applied', () => {
    mocks.defaultLocaleOption = undefined;

    render(<EditSetTitle set={set} onSubmit={vi.fn()} onDelete={vi.fn()} />);

    expect(mocks.isDisabled).toBe(true);
  });

  it('can be opened with authoritative identity', () => {
    render(<EditSetTitle set={set} onSubmit={vi.fn()} onDelete={vi.fn()} />);

    expect(mocks.isDisabled).toBe(false);
  });
});
