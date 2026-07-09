import { describe, expect, it } from 'vitest';

import type { AbstractEntity } from '@/src/shared/types';

import { computeAbstractsDiff } from './abstractsDiff';

const longCanonical: AbstractEntity = {
  id: 'abs-long-1',
  type: 'LONG',
  canonical: true,
  content: 'A long abstract about the book.',
  localeCode: 'EN',
} as AbstractEntity;

const longOther: AbstractEntity = {
  id: 'abs-long-2',
  type: 'LONG',
  canonical: false,
  content: 'Ein langer Abstract.',
  localeCode: 'DE',
} as AbstractEntity;

const shortCanonical: AbstractEntity = {
  id: 'abs-short-1',
  type: 'SHORT',
  canonical: true,
  content: 'A short abstract.',
  localeCode: 'EN',
} as AbstractEntity;

const workAbstracts = [longCanonical, longOther, shortCanonical];

describe('computeAbstractsDiff', () => {
  it('returns no mutations when nothing changed', () => {
    const diff = computeAbstractsDiff(
      workAbstracts.map((abstract) => ({ ...abstract, canonical: false })),
      workAbstracts,
    );

    expect(diff.abstractsToDelete).toEqual([]);
    expect(diff.updatedAbstracts).toEqual([]);
    expect(diff.newAbstracts).toEqual([]);
  });

  it('updates only the edited abstract, preserving its canonical flag', () => {
    const diff = computeAbstractsDiff(
      [
        { ...longCanonical, canonical: false, content: 'A rewritten long abstract.' },
        { ...longOther, canonical: false },
        { ...shortCanonical, canonical: false },
      ],
      workAbstracts,
    );

    expect(diff.abstractsToDelete).toEqual([]);
    expect(diff.newAbstracts).toEqual([]);
    expect(diff.updatedAbstracts).toEqual([
      expect.objectContaining({ id: 'abs-long-1', content: 'A rewritten long abstract.', canonical: true }),
    ]);
  });

  it('deletes an abstract the user emptied without touching the others', () => {
    const diff = computeAbstractsDiff(
      [
        { ...longCanonical, canonical: false },
        { ...shortCanonical, canonical: false },
      ],
      workAbstracts,
    );

    expect(diff.abstractsToDelete).toEqual([longOther]);
    expect(diff.updatedAbstracts).toEqual([]);
    expect(diff.newAbstracts).toEqual([]);
  });

  it('creates a new abstract as non-canonical when a canonical one of its type survives', () => {
    const newLong: AbstractEntity = {
      id: '0000-0000-0000-0000-1',
      type: 'LONG',
      canonical: false,
      content: 'Un resumen largo.',
      localeCode: 'ES',
    } as AbstractEntity;

    const diff = computeAbstractsDiff(
      [
        { ...longCanonical, canonical: false },
        { ...longOther, canonical: false },
        { ...shortCanonical, canonical: false },
        newLong,
      ],
      workAbstracts,
    );

    expect(diff.updatedAbstracts).toEqual([]);
    expect(diff.newAbstracts).toEqual([expect.objectContaining({ localeCode: 'ES', canonical: false })]);
  });

  it('promotes the first kept abstract when the canonical one is deleted', () => {
    const diff = computeAbstractsDiff(
      [
        { ...longOther, canonical: false },
        { ...shortCanonical, canonical: false },
      ],
      workAbstracts,
    );

    expect(diff.abstractsToDelete).toEqual([longCanonical]);
    expect(diff.updatedAbstracts).toEqual([expect.objectContaining({ id: 'abs-long-2', canonical: true })]);
    expect(diff.newAbstracts).toEqual([]);
  });

  it('creates the replacement as canonical when the deleted canonical is replaced by a new abstract', () => {
    const newShort: AbstractEntity = {
      id: '0000-0000-0000-0000-1',
      type: 'SHORT',
      canonical: false,
      content: 'A replacement short abstract.',
      localeCode: 'EN',
    } as AbstractEntity;

    const diff = computeAbstractsDiff(
      [{ ...longCanonical, canonical: false }, { ...longOther, canonical: false }, newShort],
      workAbstracts,
    );

    expect(diff.abstractsToDelete).toEqual([shortCanonical]);
    expect(diff.newAbstracts).toEqual([expect.objectContaining({ type: 'SHORT', canonical: true })]);
  });

  it('repairs a work whose abstracts have no canonical entry', () => {
    const strandedAbstracts = workAbstracts.map((abstract) => ({ ...abstract, canonical: false }));

    const diff = computeAbstractsDiff(
      strandedAbstracts.map((abstract) => ({ ...abstract })),
      strandedAbstracts,
    );

    expect(diff.updatedAbstracts).toEqual([
      expect.objectContaining({ id: 'abs-long-1', canonical: true }),
      expect.objectContaining({ id: 'abs-short-1', canonical: true }),
    ]);
  });
});
