import { parse } from '@5stones/onix';
import { describe, expect, it, vi } from 'vitest';

import { blockingDiagnostics, toImportIssues } from '../issues/importIssues';
import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  childPath,
  normaliseOnixMessage,
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

describe('normaliseOnixMessage', () => {
  const onix = (products: string, attributes = 'release="3.0"') =>
    normaliseOnixMessage(
      parse(`<?xml version="1.0" encoding="utf-8"?><ONIXMessage ${attributes}>${products}</ONIXMessage>`) as
        ExtendedONIXMessageRoot,
    );

  const product = (body: string, reference = 'REF') =>
    `<Product><RecordReference>${reference}</RecordReference>${body}</Product>`;

  const codes = (diagnostics: OnixSourceDiagnostic[]) => diagnostics.map(({ code }) => code);

  describe('the message boundary', () => {
    it('reads the products of a supported message', () => {
      const message = onix(`${product('', 'A')}${product('', 'B')}`);

      expect(message.release).toMatchObject({ kind: 'supported', release: '3.0' });
      expect(message.products.map(({ index, recordReference, path }) => ({ index, recordReference, path }))).toEqual([
        { index: 1, recordReference: 'A', path: 'ONIXMessage/Product[1]' },
        { index: 2, recordReference: 'B', path: 'ONIXMessage/Product[2]' },
      ]);
      expect(message.diagnostics).toEqual([]);
    });

    it('reads a single product and two products alike', () => {
      expect(onix(product('', 'A')).products).toHaveLength(1);
      expect(onix(`${product('', 'A')}${product('', 'B')}`).products).toHaveLength(2);
    });

    it('reads no product at all from a message outside the supported release', () => {
      // Under an unknown grammar the element names mean something else, so nothing is read.
      const message = onix(product(''), 'release="2.1"');

      expect(message.products).toEqual([]);
      expect(codes(message.diagnostics)).toEqual(['onix.source.unsupported_release']);
      expect(message.diagnostics[0].recovery).toBe('BLOCKING');
    });
  });

  describe('repeated Language composites', () => {
    const languages = `
      <DescriptiveDetail>
        <Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>
        <Language><LanguageRole>02</LanguageRole><LanguageCode>ger</LanguageCode></Language>
      </DescriptiveDetail>`;

    it('keeps both facts when one code is declared under two roles', () => {
      // The real Mohr Siebeck record that currently fails at the API with a duplicate language
      // code. Both are source facts; which target relation results is not decided here.
      const [normalised] = onix(product(languages)).products;

      expect(normalised.languages).toEqual([
        { role: '01', code: 'ger', ordinal: 1, path: 'ONIXMessage/Product[1]/DescriptiveDetail/Language[1]' },
        { role: '02', code: 'ger', ordinal: 2, path: 'ONIXMessage/Product[1]/DescriptiveDetail/Language[2]' },
      ]);
    });

    it('raises no duplicate-language finding and makes no target choice', () => {
      const message = onix(product(languages));

      expect(message.diagnostics).toEqual([]);
      expect(JSON.stringify(message.products)).not.toMatch(/relation|Original|TranslatedFrom/i);
    });

    it('keeps the source order and roles of three languages, two of which share a code', () => {
      const three = `
        <DescriptiveDetail>
          <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
          <Language><LanguageRole>06</LanguageRole><LanguageCode>spa</LanguageCode></Language>
          <Language><LanguageRole>07</LanguageRole><LanguageCode>eng</LanguageCode></Language>
        </DescriptiveDetail>`;
      const [normalised] = onix(product(three)).products;

      expect(normalised.languages.map(({ role, code, ordinal }) => `${ordinal}:${role}/${code}`)).toEqual([
        '1:01/eng',
        '2:06/spa',
        '3:07/eng',
      ]);
    });

    it('keeps the country and script a Language composite carries', () => {
      const scripted = `
        <DescriptiveDetail>
          <Language>
            <LanguageRole>01</LanguageRole><LanguageCode>srp</LanguageCode>
            <CountryCode>RS</CountryCode><ScriptCode>Cyrl</ScriptCode>
          </Language>
        </DescriptiveDetail>`;
      const [normalised] = onix(product(scripted)).products;

      expect(normalised.languages[0]).toMatchObject({ code: 'srp', countryCode: 'RS', scriptCode: 'Cyrl' });
    });

    it('blocks a language role or code the pinned codelists do not define', () => {
      const invalid = `
        <DescriptiveDetail>
          <Language><LanguageRole>99</LanguageRole><LanguageCode>ger</LanguageCode></Language>
          <Language><LanguageRole>01</LanguageRole><LanguageCode>xxx</LanguageCode></Language>
        </DescriptiveDetail>`;
      const message = onix(product(invalid));

      expect(codes(message.diagnostics)).toEqual([
        'onix.source.invalid_codelist_value',
        'onix.source.invalid_codelist_value',
      ]);
      expect(message.diagnostics.map(({ recovery }) => recovery)).toEqual(['BLOCKING', 'BLOCKING']);
      expect(message.diagnostics[0]).toMatchObject({
        path: 'ONIXMessage/Product[1]/DescriptiveDetail/Language[1]/LanguageRole',
        sourceValue: '99',
        evidence: { codelist: 22, codelistIssue: 74 },
      });
      expect(message.diagnostics[1]).toMatchObject({ sourceValue: 'xxx', evidence: { codelist: 74 } });
      // The facts survive the finding: nothing is dropped because it was reported.
      expect(message.products[0].languages).toHaveLength(2);
    });
  });

  describe('a TextContent with no Text', () => {
    const empty = '<TextContent><TextType>20</TextType><ContentAudience>00</ContentAudience></TextContent>';
    const full =
      '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>Blurb</Text></TextContent>';

    it('recognises it as malformed and says so as a warning, not an error', () => {
      const message = onix(product(`<CollateralDetail>${empty}</CollateralDetail>`));

      expect(message.diagnostics).toHaveLength(1);
      expect(message.diagnostics[0]).toMatchObject({
        classification: 'SOURCE_INVALID',
        severity: 'warning',
        recovery: 'OMIT_INVALID_COMPOSITE',
        code: 'onix.source.invalid_composite',
        path: 'ONIXMessage/Product[1]/CollateralDetail/TextContent[1]',
        productIndex: 1,
        recordReference: 'REF',
      });
    });

    it('omits the whole composite and invents nothing in its place', () => {
      const message = onix(product(`<CollateralDetail>${empty}${full}</CollateralDetail>`));
      const [normalised] = message.products;

      // Not the TextType, not the audience, not an empty string standing in for the missing Text.
      expect(normalised.textContents).toEqual([
        {
          textType: '03',
          contentAudience: '00',
          text: 'Blurb',
          ordinal: 2,
          path: 'ONIXMessage/Product[1]/CollateralDetail/TextContent[2]',
        },
      ]);
      expect(JSON.stringify(normalised.textContents)).not.toContain('20');
    });

    it('blocks neither the product nor the file', () => {
      const message = onix(product(`<CollateralDetail>${empty}</CollateralDetail>`));

      expect(blockingDiagnostics(message.diagnostics)).toEqual([]);
      expect(message.products).toHaveLength(1);
    });

    it('does not stop the products after it being validated', () => {
      const message = onix(
        [
          product(`<CollateralDetail>${empty}</CollateralDetail>`, 'A'),
          product(
            '<DescriptiveDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>xxx</LanguageCode></Language></DescriptiveDetail>',
            'B',
          ),
          product(`<CollateralDetail>${empty}</CollateralDetail>`, 'C'),
        ].join(''),
      );

      expect(message.products).toHaveLength(3);
      expect(message.diagnostics.map(({ productIndex, code }) => `${productIndex}:${code}`)).toEqual([
        '1:onix.source.invalid_composite',
        '2:onix.source.invalid_codelist_value',
        '3:onix.source.invalid_composite',
      ]);
    });

    it('does not make unrelated missing mandatory data non-blocking', () => {
      // The recovery is granted to this one isolated composite, not to malformed source at large.
      const message = onix(
        product(
          `<DescriptiveDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>xxx</LanguageCode></Language></DescriptiveDetail>` +
            `<CollateralDetail>${empty}</CollateralDetail>`,
        ),
      );

      expect(blockingDiagnostics(message.diagnostics).map(({ code }) => code)).toEqual([
        'onix.source.invalid_codelist_value',
      ]);
    });

    it('keeps a TextContent whose Text is present but empty, which is a different defect', () => {
      const blank =
        '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text></Text></TextContent>';
      const message = onix(product(`<CollateralDetail>${blank}</CollateralDetail>`));

      expect(message.products[0].textContents).toHaveLength(1);
      expect(message.diagnostics).toEqual([]);
    });
  });

  describe('declared name identifiers', () => {
    const contributor = (identifiers: string) =>
      product(`<DescriptiveDetail><Contributor><PersonName>A Person</PersonName>${identifiers}</Contributor></DescriptiveDetail>`);
    const nameIdentifier = (type: string, value: string) =>
      `<NameIdentifier><NameIDType>${type}</NameIDType><IDValue>${value}</IDValue></NameIdentifier>`;

    it('canonicalises a declared ORCID and keeps the spelling the file used', () => {
      const message = onix(contributor(nameIdentifier('21', 'orcid.org/0009000246664892')));
      const [identifier] = message.products[0].contributors[0].nameIdentifiers;

      expect(identifier).toEqual({
        type: '21',
        value: 'orcid.org/0009000246664892',
        ordinal: 1,
        path: 'ONIXMessage/Product[1]/DescriptiveDetail/Contributor[1]/NameIdentifier[1]',
        orcid: { canonical: '0009-0002-4666-4892', spelling: 'resolver_scheme_less', source: 'orcid.org/0009000246664892' },
      });
    });

    it('records a canonicalised spelling as provenance rather than as something to fix', () => {
      const message = onix(contributor(nameIdentifier('21', 'https://orcid.org/0009000246664892')));

      expect(message.diagnostics[0]).toMatchObject({
        classification: 'SUPPORTED_NORMALIZED',
        severity: 'info',
        recovery: 'NONE',
        code: 'onix.source.normalised_identifier',
      });
      expect(blockingDiagnostics(message.diagnostics)).toEqual([]);
      expect(toImportIssues(message.diagnostics)).toEqual([]);
    });

    it('says nothing at all about an ORCID already written canonically', () => {
      expect(onix(contributor(nameIdentifier('21', '0009-0002-4666-4892'))).diagnostics).toEqual([]);
      expect(onix(contributor(nameIdentifier('21', '0009000246664892'))).diagnostics).toEqual([]);
    });

    it('never treats an ORCID-shaped value under another scheme as an ORCID', () => {
      // ISNI is sixteen digits too. The declared NameIDType decides, never the shape.
      const message = onix(contributor(nameIdentifier('16', '0009000246664892')));
      const [identifier] = message.products[0].contributors[0].nameIdentifiers;

      expect(identifier.orcid).toBeUndefined();
      expect(identifier).toMatchObject({ type: '16', value: '0009000246664892' });
      expect(message.diagnostics).toEqual([]);
    });

    it('blocks a value declared as an ORCID that no approved spelling covers', () => {
      // A deterministic finding, never a silent fall back to having no ORCID.
      const message = onix(contributor(nameIdentifier('21', 'https://example.org/0009-0002-4666-4892')));

      expect(message.diagnostics[0]).toMatchObject({
        classification: 'SOURCE_INVALID',
        severity: 'error',
        recovery: 'BLOCKING',
        code: 'onix.source.invalid_identifier',
        sourceValue: 'https://example.org/0009-0002-4666-4892',
        path: 'ONIXMessage/Product[1]/DescriptiveDetail/Contributor[1]/NameIdentifier[1]/IDValue',
      });
      expect(message.products[0].contributors[0].nameIdentifiers[0].orcid).toBeUndefined();
    });

    it('finds the ORCID wherever it sits among repeated identifiers, keeping the others', () => {
      const message = onix(
        contributor(
          nameIdentifier('01', 'PUB-AUTHOR-99') + nameIdentifier('16', '0000000121032683') + nameIdentifier('21', '0009000246664892'),
        ),
      );
      const identifiers = message.products[0].contributors[0].nameIdentifiers;

      expect(identifiers.map(({ type, ordinal }) => `${ordinal}:${type}`)).toEqual(['1:01', '2:16', '3:21']);
      expect(identifiers.filter(({ orcid }) => !!orcid).map(({ orcid }) => orcid?.canonical)).toEqual([
        '0009-0002-4666-4892',
      ]);
    });

    it('blocks a NameIDType the pinned codelist does not define', () => {
      const message = onix(contributor(nameIdentifier('99', 'X')));

      expect(message.diagnostics[0]).toMatchObject({
        code: 'onix.source.invalid_codelist_value',
        recovery: 'BLOCKING',
        evidence: { codelist: 44, codelistIssue: 74 },
      });
    });
  });

  describe('the side-effect boundary', () => {
    it('reads the document and nothing else', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const withUrls = product(`
        <DescriptiveDetail>
          <Contributor>
            <PersonName>A Person</PersonName>
            <NameIdentifier><NameIDType>21</NameIDType><IDValue>orcid.org/0009000246664892</IDValue></NameIdentifier>
            <Website><WebsiteRole>06</WebsiteRole><WebsiteLink>https://example.org/person</WebsiteLink></Website>
          </Contributor>
        </DescriptiveDetail>
        <CollateralDetail>
          <SupportingResource>
            <ResourceVersion><ResourceLink>https://example.org/cover.jpg</ResourceLink></ResourceVersion>
          </SupportingResource>
        </CollateralDetail>`);

      const message = onix(withUrls);

      expect(message.products).toHaveLength(1);
      // Neither the ORCID resolver URL nor any other metadata URL is dereferenced.
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('is a pure function of the parsed document', () => {
      const document = parse(
        `<ONIXMessage release="3.0">${product('<DescriptiveDetail><Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language></DescriptiveDetail>')}</ONIXMessage>`,
      ) as ExtendedONIXMessageRoot;
      const before = JSON.stringify(document);

      expect(normaliseOnixMessage(document)).toEqual(normaliseOnixMessage(document));
      // The parsed document is read, never rewritten.
      expect(JSON.stringify(document)).toBe(before);
    });
  });
});
