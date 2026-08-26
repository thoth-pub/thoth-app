import { describe, expect, it, vi } from 'vitest';

import { ImportContributorRegistry } from './importContributorRegistry';

describe('ImportContributorRegistry', () => {
  const ORCID = '0000-0001-6365-5189';
  const CANONICAL = `https://orcid.org/${ORCID}`;

  /** A creation that only settles when released, so the in-flight window is observable. */
  const deferredCreation = (id: string) => {
    let release!: () => void;
    const create = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve(id);
        }),
    );

    return { create, release: () => release() };
  };

  it('shares the in-flight promise, not merely a completed id', async () => {
    const registry = new ImportContributorRegistry();
    const { create, release } = deferredCreation('contributor-1');

    // Both callers arrive while the first creation is still open — the situation `Promise.all`
    // over a work's contributions produces, and the one a completed-value cache cannot cover.
    const first = registry.resolve(ORCID, create);
    const second = registry.resolve(ORCID, create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    release();

    await expect(first).resolves.toBe('contributor-1');
    await expect(second).resolves.toBe('contributor-1');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('treats every representation of one ORCID as the same key', async () => {
    const registry = new ImportContributorRegistry();
    const create = vi.fn().mockResolvedValue('contributor-1');

    const ids = await Promise.all([
      registry.resolve(ORCID, create),
      registry.resolve(CANONICAL, create),
      registry.resolve(`  ${ORCID}  `, create),
    ]);

    expect(ids).toEqual(['contributor-1', 'contributor-1', 'contributor-1']);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps different ORCIDs independent', async () => {
    const registry = new ImportContributorRegistry();
    const create = vi
      .fn()
      .mockResolvedValueOnce('contributor-1')
      .mockResolvedValueOnce('contributor-2');

    const ids = await Promise.all([
      registry.resolve(ORCID, create),
      registry.resolve('0000-0002-1825-0097', create),
    ]);

    expect(ids).toEqual(['contributor-1', 'contributor-2']);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('passes a value that carries no ORCID identity straight through', async () => {
    const registry = new ImportContributorRegistry();
    const create = vi
      .fn()
      .mockResolvedValueOnce('contributor-1')
      .mockResolvedValueOnce('contributor-2')
      .mockResolvedValueOnce('contributor-3')
      .mockResolvedValueOnce('contributor-4');

    // Blank cells and a non-ORCID identifier: no identity signal, so no sharing. Two people can
    // share a name, and this registry must never be the thing that decides they are one person.
    const ids = await Promise.all([
      registry.resolve('', create),
      registry.resolve('   ', create),
      registry.resolve(null, create),
      registry.resolve('PROPRIETARY-1234', create),
    ]);

    expect(new Set(ids).size).toBe(4);
    expect(create).toHaveBeenCalledTimes(4);
  });

  it('keeps a rejected creation rejected for everyone sharing the key', async () => {
    const registry = new ImportContributorRegistry();
    const failure = new Error('A contributor with this ORCID ID already exists.');
    const create = vi.fn().mockRejectedValue(failure);

    const first = registry.resolve(ORCID, create);
    const second = registry.resolve(ORCID, create);

    // A failed create is a failed import. Sharing identity may not launder it into a success,
    // and must not quietly retry it behind the caller's back either.
    await expect(first).rejects.toBe(failure);
    await expect(second).rejects.toBe(failure);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('shares nothing between two registries', async () => {
    const create = vi.fn().mockResolvedValueOnce('contributor-1').mockResolvedValueOnce('contributor-2');

    await expect(new ImportContributorRegistry().resolve(ORCID, create)).resolves.toBe('contributor-1');
    await expect(new ImportContributorRegistry().resolve(ORCID, create)).resolves.toBe('contributor-2');
    expect(create).toHaveBeenCalledTimes(2);
  });
});
