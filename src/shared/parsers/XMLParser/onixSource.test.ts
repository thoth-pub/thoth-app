import { parse } from '@5stones/onix';
import { describe, expect, it } from 'vitest';

import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  childPath,
  normaliseOnixOccurrences,
  ONIX_MESSAGE_PATH,
  type OnixSourceDiagnostic,
} from './onixSource';

describe('ONIX source paths', () => {
  it('starts at the message and names each child element', () => {
    expect(ONIX_MESSAGE_PATH).toBe('ONIXMessage');
    expect(childPath(ONIX_MESSAGE_PATH, 'Header')).toBe('ONIXMessage/Header');
    expect(childPath(childPath(ONIX_MESSAGE_PATH, 'Header'), 'Sender')).toBe('ONIXMessage/Header/Sender');
  });

  it('numbers a repeatable element from one, so occurrences stay individually addressable', () => {
    expect(childPath(ONIX_MESSAGE_PATH, 'Product', 1)).toBe('ONIXMessage/Product[1]');
    expect(childPath(ONIX_MESSAGE_PATH, 'Product', 4)).toBe('ONIXMessage/Product[4]');
  });
});

describe('normaliseOnixOccurrences', () => {
  const parent = childPath(ONIX_MESSAGE_PATH, 'Product', 1);

  it('turns an absent repeatable value into a stable empty representation', () => {
    expect(normaliseOnixOccurrences(undefined, parent, 'Language')).toEqual([]);
    expect(normaliseOnixOccurrences(null, parent, 'Language')).toEqual([]);
    expect(normaliseOnixOccurrences([], parent, 'Language')).toEqual([]);
  });

  it('turns a singleton composite into exactly one normalised occurrence', () => {
    const single = normaliseOnixOccurrences({ LanguageCode: 'eng' }, parent, 'Language');

    expect(single).toEqual([
      { value: { LanguageCode: 'eng' }, ordinal: 1, path: 'ONIXMessage/Product[1]/Language[1]' },
    ]);
  });

  it('gives a singleton and the equivalent one-element array identical normalised semantics', () => {
    const single = normaliseOnixOccurrences({ LanguageCode: 'eng' }, parent, 'Language');
    const array = normaliseOnixOccurrences([{ LanguageCode: 'eng' }], parent, 'Language');

    expect(single).toEqual(array);
  });

  it('keeps repeated occurrences in source order, each with its own path', () => {
    const occurrences = normaliseOnixOccurrences(
      [{ LanguageCode: 'ger' }, { LanguageCode: 'eng' }, { LanguageCode: 'fre' }],
      parent,
      'Language',
    );

    expect(occurrences.map(({ value }) => value.LanguageCode)).toEqual(['ger', 'eng', 'fre']);
    expect(occurrences.map(({ ordinal }) => ordinal)).toEqual([1, 2, 3]);
    expect(occurrences.map(({ path }) => path)).toEqual([
      'ONIXMessage/Product[1]/Language[1]',
      'ONIXMessage/Product[1]/Language[2]',
      'ONIXMessage/Product[1]/Language[3]',
    ]);
  });

  it('drops holes a sender left in a repeated composite without renumbering its neighbours', () => {
    // `<Language/>` parses to an empty string rather than a composite; skipping it silently
    // would move every later occurrence's path onto the wrong element.
    const occurrences = normaliseOnixOccurrences(
      [{ LanguageCode: 'ger' }, undefined, { LanguageCode: 'eng' }],
      parent,
      'Language',
    );

    expect(occurrences.map(({ value }) => value.LanguageCode)).toEqual(['ger', 'eng']);
    expect(occurrences.map(({ path }) => path)).toEqual([
      'ONIXMessage/Product[1]/Language[1]',
      'ONIXMessage/Product[1]/Language[3]',
    ]);
  });

  it('normalises what the real parser emits for one and for many occurrences alike', () => {
    const message = (languages: string) => `<?xml version="1.0" encoding="utf-8"?>
      <ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">
        <Product><RecordReference>R</RecordReference>
          <DescriptiveDetail>${languages}</DescriptiveDetail>
        </Product>
      </ONIXMessage>`;
    const language = (code: string) => `<Language><LanguageRole>01</LanguageRole><LanguageCode>${code}</LanguageCode></Language>`;

    const one = parse(message(language('ger'))) as ExtendedONIXMessageRoot;
    const many = parse(message(`${language('ger')}${language('eng')}`)) as ExtendedONIXMessageRoot;
    const detail = (root: ExtendedONIXMessageRoot) =>
      (Array.isArray(root.ONIXMessage.Product) ? root.ONIXMessage.Product[0] : root.ONIXMessage.Product)
        ?.DescriptiveDetail;

    // The parser really does hand back an object for one and an array for two.
    expect(Array.isArray(detail(one)?.Language)).toBe(false);
    expect(Array.isArray(detail(many)?.Language)).toBe(true);

    expect(normaliseOnixOccurrences(detail(one)?.Language, parent, 'Language')).toHaveLength(1);
    expect(normaliseOnixOccurrences(detail(many)?.Language, parent, 'Language')).toHaveLength(2);
  });
});

describe('source diagnostics', () => {
  it('carries classification, severity and recoverability as three independent facts', () => {
    // The three are not derivable from one another: this is the shape that lets an approved
    // recovery rule call a fact source-invalid and still let the import run.
    const recoverable: OnixSourceDiagnostic = {
      classification: 'SOURCE_INVALID',
      severity: 'warning',
      recovery: 'OMIT_INVALID_COMPOSITE',
      code: 'onix.source.invalid_composite',
      message: 'x',
      path: 'ONIXMessage/Product[1]',
    };

    expect(recoverable.classification).toBe('SOURCE_INVALID');
    expect(recoverable.severity).toBe('warning');
    expect(recoverable.recovery).toBe('OMIT_INVALID_COMPOSITE');
  });
});
