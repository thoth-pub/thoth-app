// @vitest-environment node
import type { Document, Element } from 'slimdom';
import { describe, expect, it } from 'vitest';

import {
  buildXdm,
  forEachElementPath,
  indexElements,
  pathOf,
  resolveLibxmlPath,
  serializeXdm,
  XdmParseError,
} from './xdm';

const REF = 'http://ns.editeur.org/onix/3.0/reference';
const SHORT = 'http://ns.editeur.org/onix/3.0/short';

describe('buildXdm', () => {
  it('round-trips a canonical document node for node', () => {
    const text =
      `<ONIXMessage release="3.0" xmlns="${REF}"><!-- c --><?pi data?>` +
      `<Header><SenderName>A &amp; B &lt;x&gt;</SenderName></Header>` +
      `<Product datestamp="20260101"><RecordReference>r</RecordReference><Empty/>` +
      `<Text><![CDATA[<b>raw</b>]]></Text></Product></ONIXMessage>`;
    const { document } = buildXdm(text);
    expect(serializeXdm(document)).toBe(text);
    const header = document.documentElement?.firstElementChild;
    expect(header?.namespaceURI).toBe(REF);
  });

  it('keeps namespace prefixes and declarations', () => {
    const text = `<onix:ONIXMessage xmlns:onix="${REF}" release="3.0"><onix:Header/></onix:ONIXMessage>`;
    const { document } = buildXdm(text);
    expect(document.documentElement?.localName).toBe('ONIXMessage');
    expect(document.documentElement?.prefix).toBe('onix');
    expect(serializeXdm(document)).toBe(text);
  });

  it('escapes characters that a parser would otherwise normalise', () => {
    const text = `<r a="x&#9;y&#10;z&quot;"><t>line&#13;</t></r>`;
    const { document } = buildXdm(text);
    expect(document.documentElement?.getAttribute('a')).toBe('x\ty\nz"');
    expect(serializeXdm(document)).toBe(text);
  });

  it('rejects input that is not namespace well-formed', () => {
    expect(() => buildXdm('<onix:ONIXMessage/>')).toThrow(XdmParseError);
    expect(() => buildXdm('<a><b></a>')).toThrow(XdmParseError);
  });

  it('refuses a DOCTYPE even though stage 2 never lets one through', () => {
    expect(() => buildXdm('<!DOCTYPE a><a/>')).toThrow(XdmParseError);
  });
});

describe('buildXdm with Short-to-Reference renaming', () => {
  const rename = {
    shortToReference: new Map([
      ['ONIXmessage', 'ONIXMessage'],
      ['header', 'Header'],
      ['x298', 'SenderName'],
      ['product', 'Product'],
      ['a001', 'RecordReference'],
      ['textcontent', 'TextContent'],
      ['d104', 'Text'],
    ]),
    sourceNamespace: SHORT,
    targetNamespace: REF,
  };
  const short =
    `<ONIXmessage release="3.0" xmlns="${SHORT}"><header><x298>A</x298></header>` +
    `<product><a001 refname="RecordReference" shortname="a001">r</a001><textcontent><d104 textformat="05"><p>x</p></d104></textcontent></product></ONIXmessage>`;

  it('renames ONIX elements into the Reference namespace and leaves the rest untouched', () => {
    const { document } = buildXdm(short, { rename });
    expect(serializeXdm(document)).toBe(
      `<ONIXMessage release="3.0" xmlns="${REF}"><Header><SenderName>A</SenderName></Header>` +
        `<Product><RecordReference refname="RecordReference" shortname="a001">r</RecordReference><TextContent><Text textformat="05"><p>x</p></Text></TextContent></Product></ONIXMessage>`,
    );
  });

  it('moves XHTML-subset elements into the Reference namespace without renaming them', () => {
    const { document } = buildXdm(short, { rename });
    const p = document.getElementsByTagName('p')[0];
    expect(p.namespaceURI).toBe(REF);
  });

  it('records the original tag and path of every renamed element', () => {
    const { document, provenance } = buildXdm(short, { rename });
    const text = document.getElementsByTagName('Text')[0];
    expect(pathOf(text)).toBe('/ONIXMessage[1]/Product[1]/TextContent[1]/Text[1]');
    expect(provenance.sourceTagOf(text)).toBe('d104');
    expect(provenance.sourcePathOf(text)).toBe('/ONIXmessage[1]/product[1]/textcontent[1]/d104[1]');
    // Seven tags change; the XHTML-subset <p> only changes namespace.
    expect(provenance.renamedElementCount).toBe(7);
  });

  it('has no provenance for Reference input', () => {
    const { document, provenance } = buildXdm(`<ONIXMessage xmlns="${REF}"><Header/></ONIXMessage>`);
    expect(provenance.renamedElementCount).toBe(0);
    expect(provenance.sourcePathOf(document.documentElement!)).toBe('/ONIXMessage[1]');
  });
});

describe('source provenance fixed at parse time (thoth-app#231)', () => {
  const COLLATERAL = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';
  const SHORT_COLLATERAL = '/ONIXmessage[1]/product[1]/collateraldetail[1]';
  const reference =
    `<ONIXMessage xmlns="${REF}"><Product><CollateralDetail>` +
    '<TextContent><TextType>03</TextType></TextContent>' +
    '<TextContent><TextType>03</TextType><Text>b</Text></TextContent>' +
    '<TextContent><TextType>04</TextType><Text>c</Text></TextContent>' +
    '</CollateralDetail></Product></ONIXMessage>';
  const rename = {
    shortToReference: new Map([
      ['ONIXmessage', 'ONIXMessage'],
      ['product', 'Product'],
      ['collateraldetail', 'CollateralDetail'],
      ['textcontent', 'TextContent'],
      ['x426', 'TextType'],
      ['d104', 'Text'],
    ]),
    sourceNamespace: SHORT,
    targetNamespace: REF,
  };
  const short =
    `<ONIXmessage xmlns="${SHORT}"><product><collateraldetail>` +
    '<textcontent><x426>03</x426></textcontent>' +
    '<textcontent><x426>03</x426><d104>b</d104></textcontent>' +
    '<textcontent><x426>04</x426><d104>c</d104></textcontent>' +
    '</collateraldetail></product></ONIXmessage>';

  /** The approved OMIT_INVALID_COMPOSITE mutation: the first TextContent leaves the tree. */
  const omitFirstTextContent = (document: Document): Element => {
    const first = document.getElementsByTagName('TextContent')[0];
    first.parentNode!.removeChild(first);
    return first;
  };

  it('keeps the uploaded occurrence of every later sibling when a recovery removes an earlier one', () => {
    const { document, provenance } = buildXdm(reference);
    omitFirstTextContent(document);
    const [second, third] = document.getElementsByTagName('TextContent');

    expect(pathOf(second)).toBe(`${COLLATERAL}/TextContent[1]`);
    expect(provenance.sourcePathOf(second)).toBe(`${COLLATERAL}/TextContent[2]`);
    expect(pathOf(third)).toBe(`${COLLATERAL}/TextContent[2]`);
    expect(provenance.sourcePathOf(third)).toBe(`${COLLATERAL}/TextContent[3]`);
    expect(provenance.sourcePathOf(third.getElementsByTagName('Text')[0])).toBe(`${COLLATERAL}/TextContent[3]/Text[1]`);
    expect(provenance.sourceTagOf(second)).toBe('TextContent');
  });

  it('keeps the removed composite at its full uploaded path, not at the path of a detached subtree', () => {
    const { document, provenance } = buildXdm(reference);
    const removed = omitFirstTextContent(document);

    expect(pathOf(removed)).toBe('/TextContent[1]');
    expect(provenance.sourcePathOf(removed)).toBe(`${COLLATERAL}/TextContent[1]`);
    expect(provenance.sourcePathOf(removed.getElementsByTagName('TextType')[0])).toBe(
      `${COLLATERAL}/TextContent[1]/TextType[1]`,
    );
  });

  it('keeps the original Short tags and occurrences of a renamed tree', () => {
    const { document, provenance } = buildXdm(short, { rename });
    const removed = omitFirstTextContent(document);
    const [second, third] = document.getElementsByTagName('TextContent');

    expect(pathOf(second)).toBe(`${COLLATERAL}/TextContent[1]`);
    expect(provenance.sourcePathOf(second)).toBe(`${SHORT_COLLATERAL}/textcontent[2]`);
    expect(provenance.sourcePathOf(third.getElementsByTagName('Text')[0])).toBe(
      `${SHORT_COLLATERAL}/textcontent[3]/d104[1]`,
    );
    expect(provenance.sourceTagOf(third)).toBe('textcontent');
    expect(provenance.sourcePathOf(removed)).toBe(`${SHORT_COLLATERAL}/textcontent[1]`);
  });

  it.each([
    ['Reference', reference, {}],
    ['Short', short, { rename }],
    [
      'Short with a literal Reference name beside its Short twin',
      `<ONIXmessage xmlns="${SHORT}"><Product><x426>a</x426></Product><product><x426>b</x426><x426>c</x426></product><product/></ONIXmessage>`,
      { rename },
    ],
  ])(
    '%s: equals the path under source tags of the tree as parsed, element for element, while nothing is removed',
    (_label, text, options) => {
      const { document, provenance } = buildXdm(text, options);
      let checked = 0;
      forEachElementPath(document, provenance.sourceTagOf, (element, _path, namedPath) => {
        expect(provenance.sourcePathOf(element)).toBe(namedPath);
        checked++;
      });
      expect(checked).toBeGreaterThan(5);
    },
  );

  it('counts positions by source tag, so two source names renamed alike keep their own occurrences', () => {
    const { document, provenance } = buildXdm(
      `<ONIXmessage xmlns="${SHORT}"><Product><x426>a</x426></Product><product><x426>b</x426></product></ONIXmessage>`,
      { rename },
    );
    const [literal, renamed] = document.getElementsByTagName('Product');

    expect([pathOf(literal), pathOf(renamed)]).toEqual(['/ONIXMessage[1]/Product[1]', '/ONIXMessage[1]/Product[2]']);
    expect([provenance.sourcePathOf(literal), provenance.sourcePathOf(renamed)]).toEqual([
      '/ONIXmessage[1]/Product[1]',
      '/ONIXmessage[1]/product[1]',
    ]);
  });

  it('names an element the parse never produced, and so has no uploaded occurrence, where it now stands', () => {
    const { document, provenance } = buildXdm(reference);
    const added = document.createElementNS(REF, 'TextContent');
    document.getElementsByTagName('CollateralDetail')[0].appendChild(added);

    expect(provenance.sourcePathOf(added)).toBe(`${COLLATERAL}/TextContent[4]`);
    expect(provenance.sourceTagOf(added)).toBe('TextContent');
  });
});

describe('pathOf and resolveLibxmlPath', () => {
  const { document } = buildXdm(
    `<ONIXMessage xmlns="${REF}"><Header/><Product><A/><B/><A/></Product><Product><A/></Product></ONIXMessage>`,
  );

  it('produces 1-based same-name positions', () => {
    const secondA = document.getElementsByTagName('A')[1];
    expect(pathOf(secondA)).toBe('/ONIXMessage[1]/Product[1]/A[2]');
  });

  it('resolves libxml2 wildcard paths by element position', () => {
    expect(pathOf(resolveLibxmlPath(document, '/*/*[2]/*[3]')!)).toBe('/ONIXMessage[1]/Product[1]/A[2]');
    expect(pathOf(resolveLibxmlPath(document, '/*/*[3]/*')!)).toBe('/ONIXMessage[1]/Product[2]/A[1]');
  });

  it('resolves named steps by same-name position', () => {
    expect(pathOf(resolveLibxmlPath(document, '/ONIXMessage/Product[2]/A')!)).toBe('/ONIXMessage[1]/Product[2]/A[1]');
  });

  it('resolves prefixed steps by prefix, name and same-name position', () => {
    const { document: prefixed } = buildXdm(
      `<r:ONIXMessage xmlns:r="${REF}"><r:Header/><r:Product><r:A/><r:B/><r:A/></r:Product><r:Product><r:A/></r:Product></r:ONIXMessage>`,
    );
    expect(pathOf(resolveLibxmlPath(prefixed, '/r:ONIXMessage/r:Product[1]/r:A[2]')!)).toBe(
      '/ONIXMessage[1]/Product[1]/A[2]',
    );
    expect(pathOf(resolveLibxmlPath(prefixed, '/r:ONIXMessage/r:Product[2]/r:A')!)).toBe(
      '/ONIXMessage[1]/Product[2]/A[1]',
    );
    expect(resolveLibxmlPath(prefixed, '/x:ONIXMessage')).toBeNull();
  });

  it('resolves source-flavour steps through the provenance names of a renamed tree', () => {
    const xdm = buildXdm(
      `<s:ONIXmessage xmlns:s="${SHORT}"><s:header/><s:product><s:a001>r</s:a001></s:product></s:ONIXmessage>`,
      {
        rename: {
          shortToReference: new Map([
            ['ONIXmessage', 'ONIXMessage'],
            ['header', 'Header'],
            ['product', 'Product'],
            ['a001', 'RecordReference'],
          ]),
          sourceNamespace: SHORT,
          targetNamespace: REF,
        },
      },
    );
    const node = resolveLibxmlPath(xdm.document, '/s:ONIXmessage/s:product/s:a001', xdm.provenance.sourceTagOf);
    expect(pathOf(node!)).toBe('/ONIXMessage[1]/Product[1]/RecordReference[1]');
    expect(resolveLibxmlPath(xdm.document, '/s:ONIXmessage/s:product/s:a001')).toBeNull();
  });

  it('returns null for paths it cannot resolve (whole-document fail-safe upstream)', () => {
    expect(resolveLibxmlPath(document, '/*/*[9]')).toBeNull();
    expect(resolveLibxmlPath(document, '/*/*[2]/@datestamp')).toBeNull();
  });
});

describe('indexElements', () => {
  const text =
    '<ONIXMessage xmlns="http://ns.editeur.org/onix/3.0/reference"><Header><Sender><SenderName>T</SenderName></Sender></Header>' +
    '<Product><RecordReference>a</RecordReference><Text>x</Text></Product>' +
    '<!-- c --><Product><RecordReference>b</RecordReference><ProductIdentifier><IDValue>1</IDValue></ProductIdentifier></Product>' +
    '<Note><Product>not a top-level Product</Product></Note></ONIXMessage>';

  it('assigns document-order ordinals and indexes every element by local name', () => {
    const { document } = buildXdm(text);
    const index = indexElements(document);
    const ordered: string[] = [];
    forEachElementPath(
      document,
      (e) => e.localName,
      (e, path) => void ordered.push(`${index.ordinalOf(e)}:${path}`),
    );
    expect(ordered.slice(0, 5)).toEqual([
      '1:/ONIXMessage[1]',
      '2:/ONIXMessage[1]/Header[1]',
      '3:/ONIXMessage[1]/Header[1]/Sender[1]',
      '4:/ONIXMessage[1]/Header[1]/Sender[1]/SenderName[1]',
      '5:/ONIXMessage[1]/Product[1]',
    ]);
    expect(index.elementCount).toBe(ordered.length);
    expect(index.byName.get('Product')!.map((e) => pathOf(e))).toEqual([
      '/ONIXMessage[1]/Product[1]',
      '/ONIXMessage[1]/Product[2]',
      '/ONIXMessage[1]/Note[1]/Product[1]',
    ]);
    expect(index.byName.get('RecordReference')!.map((e) => e.textContent)).toEqual(['a', 'b']);
  });

  it('groups direct-child Products in document order and everything else globally', () => {
    const { document } = buildXdm(text);
    const index = indexElements(document);
    expect(index.productCount).toBe(2);
    expect(index.groups).toHaveLength(3);
    expect([...index.groups[0].keys()]).toEqual(['Product', 'RecordReference', 'Text']);
    expect([...index.groups[1].keys()]).toEqual(['Product', 'RecordReference', 'ProductIdentifier', 'IDValue']);
    expect([...index.groups[2].keys()]).toEqual(['ONIXMessage', 'Header', 'Sender', 'SenderName', 'Note', 'Product']);
    const total = index.groups.reduce((n, g) => n + [...g.values()].reduce((m, list) => m + list.length, 0), 0);
    expect(total).toBe(index.elementCount);
  });

  it('is built on the tree as it is: a removed composite is absent', () => {
    const { document } = buildXdm(text);
    const first = document.documentElement!.getElementsByTagName('Product')[0];
    first.parentNode!.removeChild(first);
    const index = indexElements(document);
    expect(index.productCount).toBe(1);
    expect(index.ordinalOf(first)).toBe(0);
  });
});
