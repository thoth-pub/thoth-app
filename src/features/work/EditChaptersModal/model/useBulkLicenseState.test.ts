import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';

import { getCommonLicense } from './bulkEdit.utils';
import { useBulkLicenseState } from './useBulkLicenseState';

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

const chapters = (license: string, copyrightHolder = ''): WorkEntity[] =>
  [
    { id: '1', license, copyrightHolder },
    { id: '2', license, copyrightHolder },
  ] as WorkEntity[];

describe('useBulkLicenseState', () => {
  it('derives the common licence from the selected chapters', () => {
    const { result } = renderHook(() => useBulkLicenseState(chapters(CC_BY), vi.fn().mockResolvedValue(undefined)));

    expect(result.current.displayLicense).toBe(CC_BY);
    expect(result.current.hasMismatch).toBe(false);
    expect(result.current.savingCount).toBe(2);
  });

  it('derives the common copyright holder from the selected chapters', () => {
    const { result } = renderHook(() =>
      useBulkLicenseState(chapters(CC_BY, 'Jane Doe'), vi.fn().mockResolvedValue(undefined)),
    );

    expect(result.current.displayCopyrightHolder).toBe('Jane Doe');
    expect(result.current.hasMismatch).toBe(false);
  });

  it('reports a mismatch when licences differ', () => {
    const mixed = [
      { id: '1', license: CC_BY, copyrightHolder: '' },
      { id: '2', license: CC0, copyrightHolder: '' },
    ] as WorkEntity[];

    const { result } = renderHook(() => useBulkLicenseState(mixed, vi.fn().mockResolvedValue(undefined)));

    expect(result.current.hasMismatch).toBe(true);
  });

  it('reports a mismatch when only the copyright holders differ', () => {
    const mixed = [
      { id: '1', license: CC_BY, copyrightHolder: 'Jane Doe' },
      { id: '2', license: CC_BY, copyrightHolder: 'John Roe' },
    ] as WorkEntity[];

    const { result } = renderHook(() => useBulkLicenseState(mixed, vi.fn().mockResolvedValue(undefined)));

    // The licence is common but the differing copyright holder still blocks bulk editing.
    expect(result.current.hasMismatch).toBe(true);
  });

  it('EditChaptersModal_keepsSubmittedLicenceVisibleWhileSaving', async () => {
    let resolveSave: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (resolveSave = resolve)));

    const { result } = renderHook(() => useBulkLicenseState(chapters(CC_BY), onSubmit));

    act(() => {
      result.current.submit(CC0, 'Author');
    });

    // While the mutation is pending the control shows the submitted values and marks itself saving.
    expect(result.current.displayLicense).toBe(CC0);
    expect(result.current.displayCopyrightHolder).toBe('Author');
    expect(result.current.hasMismatch).toBe(false);
    expect(result.current.isSaving).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(CC0, 'Author');

    await act(async () => {
      resolveSave();
    });

    expect(result.current.isSaving).toBe(false);
    // The submitted value is still held until the refetched chapters catch up.
    expect(result.current.displayLicense).toBe(CC0);
  });

  it('EditChaptersModal_doesNotPretendListPersistedBeforeMutationSuccess', () => {
    const persisted = chapters(CC_BY);
    const onSubmit = vi.fn(() => new Promise<void>(() => {}));

    const { result } = renderHook(() => useBulkLicenseState(persisted, onSubmit));

    act(() => {
      result.current.submit(CC0, 'Author');
    });

    // The submitted value is shown to the user...
    expect(result.current.displayLicense).toBe(CC0);
    // ...but the persisted chapter data is untouched: the underlying list still derives the old value.
    expect(persisted.every((chapter) => chapter.license === CC_BY)).toBe(true);
    expect(getCommonLicense(persisted).license).toBe(CC_BY);
  });

  it('clears the pending value once the persisted chapters reflect it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(({ data }) => useBulkLicenseState(data, onSubmit), {
      initialProps: { data: chapters(CC_BY) },
    });

    await act(async () => {
      result.current.submit(CC0, 'Author');
    });

    expect(result.current.displayLicense).toBe(CC0);

    // Refetch lands: chapters now carry the new licence and copyright holder.
    rerender({ data: chapters(CC0, 'Author') });

    await waitFor(() => expect(result.current.displayCopyrightHolder).toBe('Author'));
    expect(result.current.displayLicense).toBe(CC0);
    expect(result.current.isSaving).toBe(false);
  });

  it('keeps the submitted value visible after a rejected save (failure)', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useBulkLicenseState(chapters(CC_BY), onSubmit));

    await act(async () => {
      result.current.submit(CC0, 'Author');
    });

    // Saving stops, the error is surfaced by the mutation layer, and the attempted value
    // remains visible so the user understands what failed; it is not marked as persisted.
    expect(result.current.isSaving).toBe(false);
    expect(result.current.displayLicense).toBe(CC0);
  });
});
