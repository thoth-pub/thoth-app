import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import { blockingDiagnostics, importStatus, sortIssues, toImportIssues } from '../issues/importIssues';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { normaliseOnixMessage } from './onixSource';

/**
 * Regression cover for the source structures a real publisher ONIX 3.0 file was found to contain,
 * reduced to the smallest documents that still reproduce them.
 *
 * The evidence file is 866 products of a real catalogue and is not committed. What made it
 * programme evidence is reproduced here instead: one language code declared under two roles, which
 * is the record that currently fails during execution with a duplicate language code; ORCIDs
 * written four different ways under the same declared scheme; TextContent composites emitted with
 * no Text at all; and composites that occur once in one product and repeat in the next. No
 * publisher, person or bibliographic data from that file is reproduced.
 */

const message = (products: string) =>
  parse(
    `<?xml version="1.0" encoding="utf-8"?>` +
      `<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference">` +
      `<Header><Sender><SenderName>Sender</SenderName></Sender><SentDateTime>20260715</SentDateTime>` +
      `<DefaultLanguageOfText>eng</DefaultLanguageOfText></Header>${products}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;

/** One code under two roles, as the record that currently fails at the API declares it. */
const SAME_CODE_TWO_ROLES =
  '<Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>' +
  '<Language><LanguageRole>02</LanguageRole><LanguageCode>ger</LanguageCode></Language>';

const EMPTY_TEXT_CONTENT = '<TextContent><TextType>20</TextType><ContentAudience>00</ContentAudience></TextContent>';

const orcidContributor = (idValue: string, sequence: number) =>
  `<Contributor><SequenceNumber>${sequence}</SequenceNumber><ContributorRole>B01</ContributorRole>` +
  `<NameIdentifier><NameIDType>21</NameIDType><IDValue>${idValue}</IDValue></NameIdentifier>` +
  `<PersonName>Contributor ${sequence}</PersonName></Contributor>`;

const product = (reference: string, descriptive: string, collateral = '') =>
  `<Product><RecordReference>${reference}</RecordReference><NotificationType>01</NotificationType>` +
  `<DescriptiveDetail><ProductForm>BC</ProductForm>${descriptive}</DescriptiveDetail>` +
  (collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
  '</Product>';

describe('a message shaped like the real publisher file', () => {
  const document = message(
    [
      // 1: one language, one contributor with the bare ONIX ORCID encoding — singleton composites.
      product('R-1', `<Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>` +
        orcidContributor('0009000246664892', 1)),
      // 2: the same code under two roles, and a malformed TextContent beside a usable one.
      product(
        'R-2',
        SAME_CODE_TWO_ROLES + orcidContributor('orcid.org/0009000246664892', 1),
        `${EMPTY_TEXT_CONTENT}<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>` +
          '<Text textformat="02" language="ger">Beschreibung</Text></TextContent>',
      ),
      // 3: repeated contributors, resolver ORCIDs, two malformed TextContent composites.
      product(
        'R-3',
        SAME_CODE_TWO_ROLES +
          orcidContributor('https://orcid.org/0000000232479066', 1) +
          orcidContributor('0009-0002-4666-4892', 2),
        `${EMPTY_TEXT_CONTENT}${EMPTY_TEXT_CONTENT}`,
      ),
      // 4: an ISNI whose value is ORCID-shaped, declared under its own scheme.
      product(
        'R-4',
        '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>' +
          '<Contributor><ContributorRole>B01</ContributorRole>' +
          '<NameIdentifier><NameIDType>16</NameIDType><IDValue>0000000121032683</IDValue></NameIdentifier>' +
          '<PersonName>Contributor 1</PersonName></Contributor>',
      ),
    ].join(''),
  );

  const normalised = normaliseOnixMessage(document);

  it('reads every product of the message rather than stopping at the first finding', () => {
    expect(normalised.release).toMatchObject({ kind: 'supported', release: '3.0', specification: '3.0.8' });
    expect(normalised.products.map(({ index, recordReference }) => `${index}:${recordReference}`)).toEqual([
      '1:R-1',
      '2:R-2',
      '3:R-3',
      '4:R-4',
    ]);
  });

  it('lets the whole file through: every finding is a recoverable warning or provenance', () => {
    expect(blockingDiagnostics(normalised.diagnostics)).toEqual([]);
    expect(importStatus(toImportIssues(normalised.diagnostics))).toBe('success');
  });

  it('reports each malformed TextContent individually, addressed to its own composite', () => {
    const omissions = normalised.diagnostics.filter(({ recovery }) => recovery === 'OMIT_INVALID_COMPOSITE');

    expect(omissions.map(({ path }) => path)).toEqual([
      'ONIXMessage/Product[2]/CollateralDetail/TextContent[1]',
      'ONIXMessage/Product[3]/CollateralDetail/TextContent[1]',
      'ONIXMessage/Product[3]/CollateralDetail/TextContent[2]',
    ]);
    expect(omissions.map(({ recordReference }) => recordReference)).toEqual(['R-2', 'R-3', 'R-3']);
  });

  it('keeps only the usable TextContent, at the position the source gave it', () => {
    expect(normalised.products[1].textContents).toEqual([
      {
        textType: '03',
        contentAudience: '00',
        text: { '#text': 'Beschreibung', '@_textformat': '02', '@_language': 'ger' },
        ordinal: 2,
        path: 'ONIXMessage/Product[2]/CollateralDetail/TextContent[2]',
      },
    ]);
    expect(normalised.products[2].textContents).toEqual([]);
  });

  it('keeps every same-code language pair as two facts, product by product', () => {
    expect(normalised.products.map(({ languages }) => languages.map(({ role, code }) => `${role}/${code}`))).toEqual([
      ['01/ger'],
      ['01/ger', '02/ger'],
      ['01/ger', '02/ger'],
      ['01/eng'],
    ]);
    // Nothing here decided a target relation, and nothing raised a duplicate-language error.
    expect(normalised.diagnostics.some(({ message }) => /duplicate/i.test(message))).toBe(false);
  });

  it('reduces every ORCID spelling in the file to one canonical identity', () => {
    const orcids = normalised.products.flatMap(({ contributors }) =>
      contributors.flatMap(({ nameIdentifiers }) => nameIdentifiers.filter(({ orcid }) => !!orcid)),
    );

    expect(orcids.map(({ orcid, value }) => `${value} -> ${orcid?.canonical}`)).toEqual([
      '0009000246664892 -> 0009-0002-4666-4892',
      'orcid.org/0009000246664892 -> 0009-0002-4666-4892',
      'https://orcid.org/0000000232479066 -> 0000-0002-3247-9066',
      '0009-0002-4666-4892 -> 0009-0002-4666-4892',
    ]);
    // Three occurrences, one identity, and the file's own spelling still readable on each.
    expect(new Set(orcids.filter(({ value }) => value.includes('4666')).map(({ orcid }) => orcid?.canonical))).toEqual(
      new Set(['0009-0002-4666-4892']),
    );
  });

  it('leaves the ORCID-shaped ISNI alone', () => {
    const [isni] = normalised.products[3].contributors[0].nameIdentifiers;

    expect(isni).toMatchObject({ type: '16', value: '0000000121032683' });
    expect(isni.orcid).toBeUndefined();
  });

  it('addresses every normalised fact to an element a later plan can point back at', () => {
    const paths = normalised.products.flatMap(({ languages, textContents, contributors }) => [
      ...languages.map(({ path }) => path),
      ...textContents.map(({ path }) => path),
      ...contributors.flatMap(({ nameIdentifiers }) => nameIdentifiers.map(({ path }) => path)),
    ]);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith('ONIXMessage/Product['))).toBe(true);
    expect(paths).toContain('ONIXMessage/Product[3]/DescriptiveDetail/Contributor[2]/NameIdentifier[1]');
  });

  it('orders the issues a user reads by the product they belong to', () => {
    const issues = sortIssues(toImportIssues(normalised.diagnostics));

    expect(issues.map(({ source }) => (source.kind === 'onix' ? source.productIndex : 0))).toEqual([2, 3, 3]);
    expect(issues.every(({ severity }) => severity === 'warning')).toBe(true);
  });
});

describe('a singleton composite and the same composite repeated', () => {
  it('reads one product and many products to the same shape', () => {
    const body =
      '<Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>' +
      orcidContributor('0009000246664892', 1);
    const one = normaliseOnixMessage(message(product('R-1', body, EMPTY_TEXT_CONTENT)));
    const two = normaliseOnixMessage(message(product('R-1', body, EMPTY_TEXT_CONTENT) + product('R-2', body)));

    // The parser hands back an object for one Product and an array for two; both normalise the
    // same way, and the first product is identical in both readings.
    expect(one.products[0]).toEqual(two.products[0]);
    expect(one.diagnostics[0].path).toBe(two.diagnostics[0].path);
  });
});

describe('the deterministic boundary', () => {
  it('needs nothing from Thoth and reaches nothing outside the document', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const document = message(
      product(
        'R-1',
        SAME_CODE_TWO_ROLES + orcidContributor('orcid.org/0009000246664892', 1),
        `${EMPTY_TEXT_CONTENT}<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>` +
          '<Text>See https://example.org/full-text and https://doi.org/10.0000/x</Text></TextContent>',
      ),
    );

    const normalised = normaliseOnixMessage(document);

    expect(normalised.products).toHaveLength(1);
    // The ORCID resolver spelling is normalised by reading it, never by resolving it, and no
    // other metadata URL in the record is dereferenced either.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    xhr.mockRestore();
  });

  it('gives the same answer every time and never rewrites what it read', () => {
    const document = message(product('R-1', SAME_CODE_TWO_ROLES, EMPTY_TEXT_CONTENT));
    const before = JSON.stringify(document);

    expect(normaliseOnixMessage(document)).toEqual(normaliseOnixMessage(document));
    expect(JSON.stringify(document)).toBe(before);
  });
});
